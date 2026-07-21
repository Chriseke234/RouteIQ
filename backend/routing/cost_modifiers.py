import math
from typing import List, Tuple, Dict, Any
from shapely.geometry import LineString, Point, Polygon

class CostMatrixModifier:
    """
    Modifies base travel times/distances based on local Nigerian road parameters:
    1. Road Quality Index (RQI): Scales transit cost by 1.8x for degraded local corridors.
    2. Institutional Obstacles: Adds +15 minutes (900 seconds) per checkpoint encounter.
    3. Environmental Overlays: Evaluates active flood polygons against proposed route lines.
    """
    def __init__(
        self,
        degraded_corridors: List[Polygon] = None,
        checkpoints: List[Point] = None,
        flood_polygons: List[Polygon] = None
    ):
        # Coordinates are in (Longitude, Latitude) for geo-spatial consistency (x, y)
        self.degraded_corridors = degraded_corridors or []
        self.checkpoints = checkpoints or []
        self.flood_polygons = flood_polygons or []

    def compute_haversine_distance(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        """
        Compute Haversine distance between two points (lat, lon) in meters.
        """
        lat1, lon1 = p1
        lat2, lon2 = p2
        
        R = 6371000.0  # Earth radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def apply_modifications(
        self,
        start_coord: Tuple[float, float],  # (lat, lon)
        end_coord: Tuple[float, float],    # (lat, lon)
        base_time_seconds: float
    ) -> float:
        """
        Applies modifiers to the base travel time between start and end coordinates.
        """
        # Create a line representation of the transit vector in (lon, lat) space for Shapely
        route_line = LineString([(start_coord[1], start_coord[0]), (end_coord[1], end_coord[0])])
        
        modified_time = base_time_seconds
        
        # 1. Environmental Overlays (Flooding check)
        # If route intersects an active flood zone, apply a major routing cost penalty (e.g. +3 hours or infinite cost)
        for flood_zone in self.flood_polygons:
            if route_line.intersects(flood_zone):
                # Major flood detour delay: add 10,800 seconds (3 hours)
                modified_time += 10800.0

        # 2. Road Quality Index (1.8x scaling for degraded corridors)
        is_degraded = False
        for corridor in self.degraded_corridors:
            if route_line.intersects(corridor):
                is_degraded = True
                break
        
        if is_degraded:
            modified_time *= 1.8

        # 3. Institutional Obstacles (+15 mins / 900 seconds per checkpoint)
        # A checkpoint affects the route if the route passes within a threshold distance
        # Approximately 500 meters threshold in degrees (1 degree lat ~= 111km -> 500m is ~0.0045 degrees)
        checkpoint_delay = 0.0
        checkpoint_threshold_degrees = 0.0045
        for checkpoint in self.checkpoints:
            # We buffer the checkpoint to check for intersection with the route
            checkpoint_buffer = checkpoint.buffer(checkpoint_threshold_degrees)
            if route_line.intersects(checkpoint_buffer):
                checkpoint_delay += 900.0  # +15 minutes
                
        modified_time += checkpoint_delay

        return modified_time

    def build_modified_time_matrix(
        self,
        coordinates: List[Tuple[float, float]],  # list of (lat, lon)
        average_speed_mps: float = 13.89         # default ~50 km/h in meters/sec
    ) -> List[List[int]]:
        """
        Generates an NxN matrix representing modified travel times in seconds.
        """
        n = len(coordinates)
        matrix = [[0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i == j:
                    matrix[i][j] = 0
                    continue
                
                # Base time calculation based on straight-line Haversine distance
                distance_m = self.compute_haversine_distance(coordinates[i], coordinates[j])
                base_time_sec = distance_m / average_speed_mps
                
                # Apply localized modifiers
                modified_time = self.apply_modifications(coordinates[i], coordinates[j], base_time_sec)
                matrix[i][j] = int(round(modified_time))
                
        return matrix
