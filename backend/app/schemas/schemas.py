from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import List, Optional

# --- Authentication & User Schemas ---

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[UUID] = None
    role: Optional[str] = None

class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    first_name: str
    last_name: str
    fleet_id: Optional[UUID]

    class Config:
        from_attributes = True


# --- Telemetry Schemas ---

class TelemetryRecord(BaseModel):
    record_id: UUID
    trip_id: Optional[UUID] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    speed_kph: float = Field(..., ge=0.0)
    heading_degrees: float = Field(..., ge=0.0, le=360.0)
    battery_level: float = Field(..., ge=0.0, le=1.0)
    timestamp_utc: datetime

class TelemetryBatch(BaseModel):
    device_uuid: str
    telemetry_token: str
    records: List[TelemetryRecord]


# --- Trip & Waypoint (Node) Schemas ---

class TripNodeBase(BaseModel):
    sequence_index: int
    address: str
    latitude: float
    longitude: float

class TripNodeCreate(TripNodeBase):
    pass

class TripNodeOut(TripNodeBase):
    id: UUID
    trip_id: UUID
    node_status: str
    eta: Optional[datetime]
    actual_arrival: Optional[datetime]
    actual_departure: Optional[datetime]

    class Config:
        from_attributes = True

class TripCreate(BaseModel):
    driver_id: UUID
    vehicle_id: UUID
    delivery_nodes: List[TripNodeCreate]

class TripOut(BaseModel):
    id: UUID
    driver_id: UUID
    vehicle_id: UUID
    status: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    estimated_distance_meters: Optional[float]
    estimated_duration_seconds: Optional[int]
    vector_clock_client: int
    vector_clock_server: int
    nodes: List[TripNodeOut]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TripUpdate(BaseModel):
    status: Optional[str] = None
    vector_clock_client: int
