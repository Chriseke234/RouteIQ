import pytest
from shapely.geometry import Point, Polygon
from ..cost_modifiers import CostMatrixModifier
from ..optimizer import solve_cvrp

def test_haversine_distance():
    modifier = CostMatrixModifier()
    # Distance between Lagos (6.5244, 3.3792) and Ibadan (7.3775, 3.9470) is roughly 110-120 km
    lagos = (6.5244, 3.3792)
    ibadan = (7.3775, 3.9470)
    dist = modifier.compute_haversine_distance(lagos, ibadan)
    assert 110000 <= dist <= 130000

def test_road_quality_modifier():
    # Lagos coordinates
    p1 = (6.5244, 3.3792)
    p2 = (6.5500, 3.4000)
    
    # Degraded corridor polygon covering the transit path
    degraded = Polygon([(3.3600, 6.5100), (3.4200, 6.5100), (3.4200, 6.5600), (3.3600, 6.5600)])
    
    # No modifier
    modifier_normal = CostMatrixModifier()
    dist_normal = modifier_normal.compute_haversine_distance(p1, p2)
    base_time = dist_normal / 10.0 # 10 m/s
    time_normal = modifier_normal.apply_modifications(p1, p2, base_time)
    
    # With degraded corridor modifier
    modifier_degraded = CostMatrixModifier(degraded_corridors=[degraded])
    time_degraded = modifier_degraded.apply_modifications(p1, p2, base_time)
    
    # Expect 1.8x scaling
    assert time_degraded == pytest.approx(time_normal * 1.8, rel=1e-5)

def test_checkpoint_modifier():
    p1 = (6.5244, 3.3792)
    p2 = (6.5500, 3.4000)
    
    # Checkpoint right in the middle (approx 6.5372, 3.3896)
    checkpoint = Point(3.3896, 6.5372)
    
    modifier_checkpoint = CostMatrixModifier(checkpoints=[checkpoint])
    base_time = 100.0
    time_mod = modifier_checkpoint.apply_modifications(p1, p2, base_time)
    
    # Expect +900 seconds (15 minutes)
    assert time_mod == base_time + 900.0

def test_cvrp_solver():
    # 4 stops: 0 is depot, 1, 2, 3 are delivery sites
    coordinates = [
        (6.5244, 3.3792), # Lagos (Depot)
        (6.5300, 3.3800), # Stop 1
        (6.5400, 3.3900), # Stop 2
        (6.5500, 3.4000)  # Stop 3
    ]
    demands = [0, 50, 100, 50]
    vehicle_capacities = [120, 120]  # two vehicles, each can carry 120kg max
    
    # Mock time matrix: simple euclidean seconds
    modifier = CostMatrixModifier()
    time_matrix = modifier.build_modified_time_matrix(coordinates, average_speed_mps=10.0)
    
    result = solve_cvrp(
        coordinates=coordinates,
        demands=demands,
        vehicle_capacities=vehicle_capacities,
        time_matrix=time_matrix,
        depot_index=0
    )
    
    assert result["success"] is True
    assert len(result["routes"]) > 0
    # Total demand sum is 200, so we need both vehicles since capacity is 120 each
    assert len(result["routes"]) == 2
