from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.database.session import engine, Base
from sqlalchemy import text
from app.database.redis_client import redis_manager
from app.api import auth, trips, telemetry

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Start Redis connection pool
    redis_manager.connect()
    
    # 2. Database table creation (DDL init) on startup
    # In production, use Alembic. For MVP, we perform direct programmatic metadata bindings.
    async with engine.begin() as conn:
        # Enable PostGIS extension first
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
        # Create all tables defined in models.py
        await conn.run_sync(Base.metadata.create_all)
        
    yield
    
    # 3. Shutdown Redis connection
    await redis_manager.disconnect()

app = FastAPI(
    title="RouteIQ Core Ingestion & Geospatial AI Routing Engine",
    description="Offline-first routing optimization API for Nigerian logistics SMEs.",
    version="0.1.0",
    lifespan=lifespan
)

# Global CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for general rate limit or other HTTP Exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Register Endpoint Routers
app.include_router(auth.router)
app.include_router(trips.router)
app.include_router(telemetry.router)

@app.get("/health", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "api_version": "0.1.0",
        "environment": "development"
    }
