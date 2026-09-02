from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from uuid import UUID

from app.database.session import get_db_session
from app.database.models import Trip, TripNode, Driver, Vehicle
from app.schemas.schemas import TripCreate, TripOut, TripUpdate
from app.api.auth import get_current_user
from app.database.models import User

# We import worker inside the function or lazily to avoid circular imports during celery initialization
router = APIRouter(prefix="/api/v1/trips", tags=["trips"])

@router.post("", response_model=TripOut, status_code=status.HTTP_202_ACCEPTED)
async def create_trip(
    trip_data: TripCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    if current_user.role not in ["admin", "dispatcher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or dispatcher can dispatch trips."
        )

    # Validate driver
    result = await db.execute(select(Driver).where(Driver.id == trip_data.driver_id))
    driver = result.scalars().first()
    if not driver:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid driver_id.")

    # Validate vehicle
    result = await db.execute(select(Vehicle).where(Vehicle.id == trip_data.vehicle_id))
    vehicle = result.scalars().first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid vehicle_id.")

    # Create trip in pending state
    trip = Trip(
        driver_id=trip_data.driver_id,
        vehicle_id=trip_data.vehicle_id,
        status="pending"
    )
    db.add(trip)
    await db.flush()

    # Create delivery nodes with 100m radius geofence polygons in PostGIS
    # Formula for 100m radius polygon in degrees (~0.0009 degrees = 100m)
    # PostGIS: ST_Buffer(centroid_geom, 0.0009)
    for node_data in trip_data.delivery_nodes:
        centroid_wkt = f"SRID=4326;POINT({node_data.longitude} {node_data.latitude})"
        # Generate buffered geofence using ST_Buffer
        geofence_expr = func.ST_Buffer(func.ST_GeomFromText(centroid_wkt), 0.0009)
        
        node = TripNode(
            trip_id=trip.id,
            sequence_index=node_data.sequence_index,
            address=node_data.address,
            centroid_geom=centroid_wkt,
            geofence_geom=geofence_expr
        )
        db.add(node)

    await db.commit()

    # Load complete trip with nodes to pass to Celery
    query = select(Trip).options(selectinload(Trip.nodes)).where(Trip.id == trip.id)
    result = await db.execute(query)
    trip_out = result.scalars().first()

    # Trigger Celery Background Optimization Task
    from app.worker import optimize_vrp_route_task
    optimize_vrp_route_task.delay(str(trip.id))

    return trip_out

@router.get("/{trip_id}", response_model=TripOut)
async def get_trip(
    trip_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(Trip).options(selectinload(Trip.nodes)).where(Trip.id == trip_id)
    result = await db.execute(query)
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")
    return trip

@router.put("/{trip_id}", response_model=TripOut)
async def update_trip(
    trip_id: UUID,
    trip_update: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    query = select(Trip).options(selectinload(Trip.nodes)).where(Trip.id == trip_id)
    result = await db.execute(query)
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found.")

    # Vector Clock Conflict Resolution
    # Driver tries to sync state offline -> checks client vector clock
    client_clock = trip_update.vector_clock_client
    server_clock = trip.vector_clock_server

    if client_clock <= server_clock:
        # Conflict: Server has a newer update from dispatch, reject client state update
        # Return HTTP 409 Conflict with the current server representation
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Conflict detected. Your local trip state is out of date.",
                "server_trip": TripOut.from_orm(trip).dict()
            }
        )

    # Accept client state update
    if trip_update.status:
        trip.status = trip_update.status
    
    trip.vector_clock_client = client_clock
    trip.vector_clock_server = server_clock + 1
    trip.updated_at = func.now()

    await db.commit()
    await db.refresh(trip)
    return trip
