from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import datetime

from app.database.session import get_db_session
from app.database.models import TelemetryLog, OfflineSyncQueue, Vehicle
from app.database.redis_client import redis_manager
from app.schemas.schemas import TelemetryBatch
from app.api.auth import get_current_user
from app.database.models import User

router = APIRouter(prefix="/api/v1/telemetry", tags=["telemetry"])

@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry_batch(
    batch: TelemetryBatch,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session)
):
    # 1. Rate Limiting Check
    # Limit to 100 requests per minute per device UUID
    is_allowed = await redis_manager.check_rate_limit(client_id=batch.device_uuid, limit=100, window_seconds=60)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Max 100 uploads per minute per device."
        )

    # 2. Idempotency Check (Deduplication)
    # Check if the telemetry token has already been processed
    result = await db.execute(
        select(OfflineSyncQueue).where(OfflineSyncQueue.telemetry_token == batch.telemetry_token)
    )
    existing_queue = result.scalars().first()
    if existing_queue:
        if existing_queue.status == "processed":
            return {
                "status": "success",
                "processed_records": existing_queue.record_count,
                "telemetry_token": batch.telemetry_token,
                "detail": "Duplicate batch already processed."
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Batch sync is already {existing_queue.status}."
            )

    # Validate that records are present
    if not batch.records:
        return {
            "status": "success",
            "processed_records": 0,
            "telemetry_token": batch.telemetry_token
        }

    # Register the batch token in the sync queue
    sync_entry = OfflineSyncQueue(
        device_uuid=batch.device_uuid,
        telemetry_token=batch.telemetry_token,
        status="pending",
        record_count=len(batch.records)
    )
    db.add(sync_entry)
    await db.flush()  # get generated id / reserve token

    try:
        # Check if the vehicles exist to avoid ForeignKey violations
        # In a real environment, we'd batch fetch, but here we can bulk validate
        vehicle_ids = {record.trip_id for record in batch.records if record.trip_id}
        # In this simplistic version, we assume vehicle is linked via user or metadata.
        # Let's search for a vehicle corresponding to this driver user
        result = await db.execute(select(Vehicle).where(Vehicle.current_driver_id == current_user.driver_profile.id))
        vehicle = result.scalars().first()
        if not vehicle:
            # Create a mock vehicle or raise error
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Driver does not have an active assigned vehicle."
            )

        logs_to_insert = []
        for record in batch.records:
            # Construct WKT representation for Point (Longitude, Latitude)
            point_wkt = f"SRID=4326;POINT({record.longitude} {record.latitude})"
            
            log = TelemetryLog(
                vehicle_id=vehicle.id,
                trip_id=record.trip_id,
                geom_location=point_wkt,
                speed_kph=record.speed_kph,
                heading_degrees=record.heading_degrees,
                battery_level=record.battery_level,
                timestamp_utc=record.timestamp_utc
            )
            logs_to_insert.append(log)

        # Bulk insert
        db.add_all(logs_to_insert)
        
        # Update queue state
        sync_entry.status = "processed"
        await db.commit()

    except Exception as e:
        await db.rollback()
        sync_entry.status = "failed"
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process telemetry batch: {str(e)}"
        )

    return {
        "status": "success",
        "processed_records": len(batch.records),
        "telemetry_token": batch.telemetry_token
    }
