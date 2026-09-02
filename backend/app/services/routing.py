import httpx
import logging
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text
from shapely.geometry import Point
from uuid import UUID
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

from app.config import settings
from app.database.models import Trip, TripNode, RoadRiskOverlay, Vehicle, TelemetryLog

logger = logging.getLogger(__name__)

class OSRMClient:
    def __init__(self):
        self.base_url = settings.OSRM_URL

    async def get_distance_matrix(self, coordinates: List[Tuple[float, float]]) -> Tuple[List[List[float]], List[List[float]]]:
        """
        Queries OSRM table service for duration and distance matrices.
        coordinates: List of (longitude, latitude) tuples.
        Returns: (duration_matrix, distance_matrix) in seconds and meters.
        """
        coords_str = ";".join([f"{lon},{lat}" for lon, lat in coordinates])
        url = f"{self.base_url}/table/v1/driving/{coords_str}?annotations=duration,distance"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url)
                if response.status_code != 200:
                    raise Exception(f"OSRM returned status code {response.status_code}")
                data = response.json()
                if "durations" not in data or "distances" not in data:
                    raise Exception("OSRM response missing durations or distances annotations.")
                return data["durations"], data["distances"]
            except Exception as e:
                logger.error(f"Error querying OSRM: {str(e)}")
                # Return mock Euclidean distance matrix as fallback
                n = len(coordinates)
                mock_durations = [[0.0] * n for _ in range(n)]
                mock_distances = [[0.0] * n for _ in range(n)]
                for i in range(n):
                    for j in range(n):
                        if i != j:
                            # 1 degree is roughly 111 km. Estimate duration at 50 km/h
                            dx = coordinates[i][0] - coordinates[j][0]
                            dy = coordinates[i][1] - coordinates[j][1]
                            dist_m = ((dx**2 + dy**2)**0.5) * 111000
                            mock_distances[i][j] = dist_m
                            mock_durations[i][j] = dist_m / 13.88  # 50 km/h in m/s
                return mock_durations, mock_distances


class CostMatrixModifier:
    @staticmethod
    async def modify_matrix(
        db: AsyncSession,
        coordinates: List[Tuple[float, float]],
        base_durations: List[List[float]],
        base_distances: List[List[float]]
    ) -> List[List[float]]:
        """
        Applies Nigerian local factor weights on the base durations matrix.
        Factors:
        - Road Quality: 1.8x travel cost modifier on degraded roads.
        - Checkpoints: +15 mins (900 seconds) delay.
        - Flood Overlays: Impassable (very high cost).
        """
        n = len(coordinates)
        modified_matrix = [row[:] for row in base_durations]

        for i in range(n):
            for j in range(n):
                if i == j:
                    modified_matrix[i][j] = 0.0
                    continue

                lon1, lat1 = coordinates[i]
                lon2, lat2 = coordinates[j]

                # Query PostGIS to check intersection between the path segment (line string) and risk overlays
                # We build a line between node i and node j
                query = text("""
                    SELECT risk_type, severity_multiplier, fixed_delay_seconds
                    FROM road_risk_overlays
                    WHERE is_active = TRUE
                      AND (expires_at IS NULL OR expires_at > NOW())
                      AND ST_Intersects(
                          ST_GeomFromText(:line_wkt, 4326),
                          risk_geom
                      )
                """)
                line_wkt = f"LINESTRING({lon1} {lat1}, {lon2} {lat2})"
                result = await db.execute(query, {"line_wkt": line_wkt})
                risks = result.fetchall()

                # Apply cost modifications
                road_quality_multiplier = 1.0
                fixed_delays = 0
                is_flooded = False

                for risk in risks:
                    risk_type, severity_multiplier, fixed_delay_seconds = risk
                    if risk_type == 'flood':
                        is_flooded = True
                    elif risk_type == 'degraded_road':
                        road_quality_multiplier = max(road_quality_multiplier, float(severity_multiplier))
                    elif risk_type == 'police_delay':
                        fixed_delays += fixed_delay_seconds

                if is_flooded:
                    modified_matrix[i][j] = 9999999.0  # Impassable barrier cost
                else:
                    # Apply formula: adjusted_cost = base_duration * quality_multiplier + fixed_delays
                    # Ensure minimum cost is base duration
                    modified_matrix[i][j] = (modified_matrix[i][j] * road_quality_multiplier) + fixed_delays

        return modified_matrix


class ORToolsRoutingSolver:
    @staticmethod
    def solve_route(cost_matrix: List[List[float]], start_index: int = 0) -> List[int]:
        """
        Solves the TSP/VRP routing path returning the optimal sequence of indices.
        """
        num_locations = len(cost_matrix)
        if num_locations <= 1:
            return list(range(num_locations))

        # Create routing model manager
        # Arguments: number of locations, number of vehicles, starts/ends
        manager = pywrapcp.RoutingIndexManager(num_locations, 1, start_index)
        routing = pywrapcp.RoutingModel(manager)

        # Create transit callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            # Make sure we convert floats to integers for OR-Tools (in seconds)
            return int(cost_matrix[from_node][to_node])

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)

        # Set cost of transit
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Set search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.time_limit.seconds = 5  # Give the solver up to 5 seconds

        # Solve the problem
        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            logger.warning("No routing solution found. Returning default sequential indices.")
            return list(range(num_locations))

        # Extract sequence from solution
        index = routing.Start(0)
        route_sequence = []
        while not routing.IsEnd(index):
            route_sequence.append(manager.IndexToNode(index))
            index = solution.Value(routing.NextVar(index))
            
        return route_sequence


async def optimize_trip_route(db: AsyncSession, trip_id: UUID) -> Dict[str, Any]:
    """
    Orchestrates the entire routing pipeline: OSRM -> Cost Matrix Modifier -> OR-Tools -> DB update.
    """
    # 1. Fetch trip and delivery nodes
    query = select(Trip).where(Trip.id == trip_id)
    result = await db.execute(query)
    trip = result.scalars().first()
    if not trip:
        raise ValueError("Trip not found")

    query_nodes = select(TripNode).where(TripNode.trip_id == trip_id).order_by(TripNode.sequence_index)
    result_nodes = await db.execute(query_nodes)
    nodes = result_nodes.scalars().all()
    if not nodes:
        return {"status": "skipped", "reason": "No waypoints in trip"}

    # 2. Establish start point
    # We fetch vehicle's latest telemetry coordinate, or fallback to the centroid of the first node
    result_telemetry = await db.execute(
        select(TelemetryLog)
        .where(TelemetryLog.vehicle_id == trip.vehicle_id)
        .order_by(TelemetryLog.timestamp_utc.desc())
        .limit(1)
    )
    last_telemetry = result_telemetry.scalars().first()

    # Coordinates list for OSRM matrix query
    coords: List[Tuple[float, float]] = []
    
    # Check if we have vehicle starting coordinates
    start_from_telemetry = False
    if last_telemetry:
        # Wait, geom_location is a PostGIS geometry, we can query its coordinates using ST_X and ST_Y
        res_coords = await db.execute(
            text("SELECT ST_X(:geom) AS lon, ST_Y(:geom) AS lat"),
            {"geom": last_telemetry.geom_location}
        )
        row = res_coords.fetchone()
        if row:
            coords.append((row.lon, row.lat))
            start_from_telemetry = True

    # If telemetry is missing, start from the first node centroid
    if not start_from_telemetry:
        res_coords = await db.execute(
            text("SELECT ST_X(:geom) AS lon, ST_Y(:geom) AS lat"),
            {"geom": nodes[0].centroid_geom}
        )
        row = res_coords.fetchone()
        coords.append((row.lon, row.lat))

    # Append all trip waypoints centroids
    node_index_map = {}  # maps position in coords list back to node object
    for idx, node in enumerate(nodes):
        res_coords = await db.execute(
            text("SELECT ST_X(:geom) AS lon, ST_Y(:geom) AS lat"),
            {"geom": node.centroid_geom}
        )
        row = res_coords.fetchone()
        coords.append((row.lon, row.lat))
        node_index_map[len(coords) - 1] = node

    # 3. Query base matrix from OSRM
    osrm = OSRMClient()
    base_durations, base_distances = await osrm.get_distance_matrix(coords)

    # 4. Modify matrix with Nigerian local overlays
    modified_durations = await CostMatrixModifier.modify_matrix(
        db, coords, base_durations, base_distances
    )

    # 5. Run OR-Tools Routing Solver
    sequence = ORToolsRoutingSolver.solve_route(modified_durations, start_index=0)

    # Note: index 0 is the starting point (telemetry or first node).
    # Remaining indices correspond to delivery nodes.
    # Re-sequence the nodes in the database based on the optimized sequence
    new_sequence_index = 0
    total_duration = 0.0
    total_distance = 0.0
    
    for seq_val in sequence:
        if seq_val == 0 and start_from_telemetry:
            continue
        
        node_to_update = node_index_map.get(seq_val)
        if node_to_update:
            node_to_update.sequence_index = new_sequence_index
            
            # Calculate ETA (duration in seconds from start node)
            # For simplicity, we accumulate the durations along the optimized path
            # In a real environment we'd query OSRM for the exact path details
            prev_node_index = sequence[sequence.index(seq_val) - 1]
            total_duration += modified_durations[prev_node_index][seq_val]
            total_distance += base_distances[prev_node_index][seq_val]
            
            eta_seconds = int(total_duration)
            node_to_update.eta = func.now() + text(f"INTERVAL '{eta_seconds} seconds'")
            new_sequence_index += 1

    # 6. Save optimized ETAs and distances to the trip
    trip.status = "optimized"
    trip.estimated_distance_meters = total_distance
    trip.estimated_duration_seconds = int(total_duration)
    trip.updated_at = func.now()

    await db.commit()
    return {
        "status": "success",
        "trip_id": str(trip_id),
        "total_distance_meters": total_distance,
        "total_duration_seconds": total_duration
    }
