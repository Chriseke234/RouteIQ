from typing import List, Dict, Any, Tuple
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def solve_cvrp(
    coordinates: List[Tuple[float, float]],       # List of (lat, lon) coordinates (0 is depot)
    demands: List[int],                           # Demand at each stop (depot has 0 demand)
    vehicle_capacities: List[int],                 # Maximum load capacity for each vehicle
    time_matrix: List[List[int]],                 # NxN time matrix in seconds
    depot_index: int = 0,
    time_limit_seconds: int = 5
) -> Dict[str, Any]:
    """
    Solves the Capacitated Vehicle Routing Problem (CVRP) using Google OR-Tools.
    Returns the optimal routes, total distance/time, and vehicle loads.
    """
    num_vehicles = len(vehicle_capacities)
    num_locations = len(coordinates)
    
    if num_locations <= 1:
        return {
            "status": "SUCCESS",
            "routes": [],
            "total_time_seconds": 0,
            "success": True
        }

    # Create the routing index manager: N locations, V vehicles, depot index
    manager = pywrapcp.RoutingIndexManager(
        num_locations,
        num_vehicles,
        depot_index
    )

    # Create Routing Model
    routing = pywrapcp.RoutingModel(manager)

    # 1. Create and register transit callback (Time)
    def time_callback(from_index, to_index):
        # Convert from routing variable Index to distance matrix NodeIndex.
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return time_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(time_callback)

    # Define cost of each arc
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Add Time constraint/dimension
    time_dimension_name = "Time"
    # Allow arbitrary waiting (slack) at nodes, and set large max transit limit per vehicle (e.g. 24 hours / 86400 seconds)
    routing.AddDimension(
        transit_callback_index,
        86400,  # allow waiting time
        86400,  # maximum time per vehicle
        True,   # start cumul to zero
        time_dimension_name
    )
    time_dimension = routing.GetDimensionOrDie(time_dimension_name)
    # Minimize the maximum travel time among vehicles to ensure balance
    time_dimension.SetGlobalSpanCostCoefficient(100)

    # 2. Create and register demand callback (Capacity)
    def demand_callback(from_index):
        # Convert from routing variable Index to demand NodeIndex.
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
    
    # Add Capacity constraint/dimension
    capacity_dimension_name = "Capacity"
    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,                     # null capacity slack
        vehicle_capacities,    # vehicle maximum capacities
        True,                  # start cumul to zero
        capacity_dimension_name
    )

    # Setting first solution heuristic
    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = time_limit_seconds

    # Solve the problem
    solution = routing.SolveWithParameters(search_parameters)

    # Format solution
    if not solution:
        return {
            "status": "NO_SOLUTION_FOUND",
            "success": False,
            "routes": []
        }

    routes = []
    total_time_seconds = 0
    
    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route_stops = []
        route_load = 0
        route_time = 0
        
        while not routing.IsEnd(index):
            node_index = manager.IndexToNode(index)
            route_stops.append({
                "node_index": node_index,
                "coordinates": coordinates[node_index],
                "demand": demands[node_index]
            })
            route_load += demands[node_index]
            
            previous_index = index
            index = solution.Value(routing.NextVar(index))
            route_time += time_matrix[manager.IndexToNode(previous_index)][manager.IndexToNode(index)]
            
        # Add the final depot stop
        node_index = manager.IndexToNode(index)
        route_stops.append({
            "node_index": node_index,
            "coordinates": coordinates[node_index],
            "demand": demands[node_index]
        })
        
        if len(route_stops) > 2:  # Only count routes that actually visit waypoints
            routes.append({
                "vehicle_id": vehicle_id,
                "stops": route_stops,
                "load": route_load,
                "duration_seconds": route_time
            })
            total_time_seconds += route_time

    return {
        "status": "SUCCESS",
        "success": True,
        "routes": routes,
        "total_time_seconds": total_time_seconds
    }
