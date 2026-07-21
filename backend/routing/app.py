from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Tuple, Optional, Dict, Any
from shapely.geometry import Point, Polygon
try:
    from .cost_modifiers import CostMatrixModifier
    from .optimizer import solve_cvrp
except ImportError:
    from cost_modifiers import CostMatrixModifier
    from optimizer import solve_cvrp

app = FastAPI(
    title="RouteIQ Geospatial routing optimizer MVP v0.1",
    description="Intelligent route optimizer with Nigerian road factors."
)

class PolygonCoords(BaseModel):
    # A polygon is a list of [lon, lat] coordinates (external boundary)
    coordinates: List[Tuple[float, float]]

class PointCoords(BaseModel):
    # A point is [lon, lat]
    coordinate: Tuple[float, float]

class OptimizeRequest(BaseModel):
    # Coordinates as [latitude, longitude] to follow common mapping conventions
    coordinates: List[Tuple[float, float]] = Field(..., description="List of (lat, lon) coordinates, index 0 is depot")
    demands: List[int] = Field(..., description="Demands for each location, depot has demand 0")
    vehicle_capacities: List[int] = Field(..., description="Load capacity for each vehicle")
    
    # Custom overlays (optional, otherwise empty)
    degraded_corridors: Optional[List[PolygonCoords]] = Field(default=None)
    checkpoints: Optional[List[PointCoords]] = Field(default=None)
    flood_polygons: Optional[List[PolygonCoords]] = Field(default=None)
    
    average_speed_mps: float = Field(default=13.89, description="Average speed in m/s (~50 km/h)")
    time_limit_seconds: int = Field(default=5, description="Search time limit in seconds")

@app.post("/optimize")
def optimize_routes(req: OptimizeRequest):
    if len(req.coordinates) != len(req.demands):
        raise HTTPException(status_code=400, detail="Number of coordinates must equal number of demands.")
    
    # 1. Parse geo overlays into Shapely geometries
    shapely_degraded = []
    if req.degraded_corridors:
        for poly in req.degraded_corridors:
            if len(poly.coordinates) >= 3:
                shapely_degraded.append(Polygon(poly.coordinates))
                
    shapely_checkpoints = []
    if req.checkpoints:
        for pt in req.checkpoints:
            shapely_checkpoints.append(Point(pt.coordinate))
            
    shapely_floods = []
    if req.flood_polygons:
        for poly in req.flood_polygons:
            if len(poly.coordinates) >= 3:
                shapely_floods.append(Polygon(poly.coordinates))

    # 2. Build cost modifier
    modifier = CostMatrixModifier(
        degraded_corridors=shapely_degraded,
        checkpoints=shapely_checkpoints,
        flood_polygons=shapely_floods
    )

    # 3. Generate modified travel time matrix
    time_matrix = modifier.build_modified_time_matrix(
        req.coordinates,
        average_speed_mps=req.average_speed_mps
    )

    # 4. Solve VRP
    try:
        solution = solve_cvrp(
            coordinates=req.coordinates,
            demands=req.demands,
            vehicle_capacities=req.vehicle_capacities,
            time_matrix=time_matrix,
            depot_index=0,
            time_limit_seconds=req.time_limit_seconds
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"VRP Solver Error: {str(e)}")
        
    return solution
