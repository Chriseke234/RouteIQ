import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Numeric, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'admin', 'dispatcher', 'driver'
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    fleet_id = Column(UUID(as_uuid=True), ForeignKey("fleets.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fleet = relationship("Fleet", back_populates="users")
    driver_profile = relationship("Driver", uselist=False, back_populates="user")

class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="fleet")
    vehicles = relationship("Vehicle", back_populates="fleet")

class Driver(Base):
    __tablename__ = "drivers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    phone_number = Column(String(20), unique=True, nullable=False)
    license_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum('active', 'inactive', 'suspended', name='driver_status_enum'), nullable=False, default='active')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="driver_profile")
    vehicle = relationship("Vehicle", uselist=False, back_populates="driver")
    trips = relationship("Trip", back_populates="driver")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plate_number = Column(String(20), unique=True, nullable=False, index=True)
    model = Column(String(50), nullable=False)
    fuel_capacity_liters = Column(Numeric(5, 2), nullable=False)
    current_driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)
    fleet_id = Column(UUID(as_uuid=True), ForeignKey("fleets.id", ondelete="SET NULL"), nullable=True)
    status = Column(Enum('operational', 'maintenance', 'decommissioned', name='vehicle_status_enum'), nullable=False, default='operational')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    driver = relationship("Driver", foreign_keys=[current_driver_id], back_populates="vehicle")
    fleet = relationship("Fleet", back_populates="vehicles")
    trips = relationship("Trip", back_populates="vehicle")
    telemetry_logs = relationship("TelemetryLog", back_populates="vehicle")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id"), nullable=False)
    status = Column(Enum('pending', 'optimized', 'in_transit', 'completed', 'canceled', name='trip_status_enum'), nullable=False, default='pending')
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    estimated_distance_meters = Column(Numeric(10, 2), nullable=True)
    estimated_duration_seconds = Column(Integer, nullable=True)
    vector_clock_client = Column(Integer, nullable=False, default=0)
    vector_clock_server = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    driver = relationship("Driver", back_populates="trips")
    vehicle = relationship("Vehicle", back_populates="trips")
    nodes = relationship("TripNode", back_populates="trip", order_by="TripNode.sequence_index", cascade="all, delete-orphan")
    telemetry_logs = relationship("TelemetryLog", back_populates="trip")

class TripNode(Base):
    __tablename__ = "trip_nodes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    sequence_index = Column(Integer, nullable=False)
    node_status = Column(Enum('pending', 'arrived', 'delivered', 'skipped', name='node_status_enum'), nullable=False, default='pending')
    address = Column(String(500), nullable=False)
    geofence_geom = Column(Geometry('POLYGON', srid=4326), nullable=False)
    centroid_geom = Column(Geometry('POINT', srid=4326), nullable=False)
    eta = Column(DateTime, nullable=True)
    actual_arrival = Column(DateTime, nullable=True)
    actual_departure = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    trip = relationship("Trip", back_populates="nodes")

    __table_args__ = (
        Index("idx_trip_nodes_geofence", "geofence_geom", postgresql_using="gist"),
        Index("idx_trip_nodes_centroid", "centroid_geom", postgresql_using="gist"),
        Index("idx_trip_nodes_trip_seq", "trip_id", "sequence_index", unique=True),
    )

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    geom_location = Column(Geometry('POINT', srid=4326), nullable=False)
    speed_kph = Column(Numeric(5, 2), nullable=False)
    heading_degrees = Column(Numeric(5, 2), nullable=False)
    battery_level = Column(Numeric(3, 2), nullable=False)
    timestamp_utc = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="telemetry_logs")
    trip = relationship("Trip", back_populates="telemetry_logs")

    __table_args__ = (
        Index("idx_telemetry_logs_geom", "geom_location", postgresql_using="gist"),
        Index("idx_telemetry_vehicle_timestamp", "vehicle_id", "timestamp_utc"),
    )

class RoadRiskOverlay(Base):
    __tablename__ = "road_risk_overlays"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    risk_type = Column(String(50), nullable=False)  # 'flood', 'police_delay', 'degraded_road'
    severity_multiplier = Column(Numeric(3, 2), nullable=False, default=1.0)
    fixed_delay_seconds = Column(Integer, nullable=False, default=0)
    risk_geom = Column(Geometry('POLYGON', srid=4326), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_road_risk_geom", "risk_geom", postgresql_using="gist"),
    )

class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True)
    liters = Column(Numeric(6, 2), nullable=False)
    cost = Column(Numeric(10, 2), nullable=False)
    odometer_reading = Column(Numeric(10, 2), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class OfflineSyncQueue(Base):
    __tablename__ = "offline_sync_queues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_uuid = Column(String(100), nullable=False)
    telemetry_token = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="pending")  # 'pending', 'processed', 'failed'
    record_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
