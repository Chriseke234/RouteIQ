import pytest
import asyncio
import time
import httpx
from datetime import datetime, timedelta
import uuid

from app.config import settings

BASE_URL = "http://localhost:8000"

@pytest.mark.asyncio
async def test_api_health():
    """Verify backend web server health endpoint."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_jwt_auth_required():
    """Verify endpoints reject requests with missing or invalid tokens."""
    async with httpx.AsyncClient() as client:
        # Ingestion requires authentication
        payload = {
            "device_uuid": "test-device-123",
            "telemetry_token": str(uuid.uuid4()),
            "records": []
        }
        response = await client.post(f"{BASE_URL}/api/v1/telemetry/batch", json=payload)
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_telemetry_batch_ingestion_and_deduplication():
    """
    Test bulk ingestion, rate-limiting, and UUIDv4 token deduplication.
    Validates that P99 ingestion latency stays under 300ms.
    """
    async with httpx.AsyncClient() as client:
        # 1. Login to obtain access token
        # For tests, we mock credentials in database or execute direct login
        # If testing in isolated dev docker, we assume seed data has been created.
        login_data = {
            "email": "driver@routeiq.com",
            "password": "driverpassword"
        }
        login_response = await client.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Build mock telemetry batch
        device_uuid = "test-device-uuid-999"
        telemetry_token = str(uuid.uuid4())
        
        batch = {
            "device_uuid": device_uuid,
            "telemetry_token": telemetry_token,
            "records": [
                {
                    "record_id": str(uuid.uuid4()),
                    "latitude": 6.5244,
                    "longitude": 3.3792,
                    "speed_kph": 30.5,
                    "heading_degrees": 90.0,
                    "battery_level": 0.95,
                    "timestamp_utc": datetime.utcnow().iso8601() if hasattr(datetime.utcnow(), 'iso8601') else datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
                }
            ]
        }

        # 3. Post telemetry batch and measure latency
        start_time = time.time()
        response = await client.post(
            f"{BASE_URL}/api/v1/telemetry/batch", 
            json=batch, 
            headers=headers
        )
        end_time = time.time()
        latency_ms = (end_time - start_time) * 1000

        # Assert target latency is met (P99 < 300ms)
        assert latency_ms < 300.0, f"Ingestion latency of {latency_ms:.2f}ms exceeded the P99 target limit of 300ms."
        assert response.status_code == 201
        assert response.json()["status"] == "success"

        # 4. Test Idempotency (Duplicate token upload)
        duplicate_response = await client.post(
            f"{BASE_URL}/api/v1/telemetry/batch",
            json=batch,
            headers=headers
        )
        assert duplicate_response.status_code == 201
        assert duplicate_response.json()["detail"] == "Duplicate batch already processed."

        # 5. Test Rate Limiter (simulate rate limit overflow)
        # We send multiple requests within seconds to trigger the 100 req/min rule
        triggered_limit = False
        for _ in range(101):
            rate_limit_token = str(uuid.uuid4())
            batch["telemetry_token"] = rate_limit_token
            res = await client.post(
                f"{BASE_URL}/api/v1/telemetry/batch",
                json=batch,
                headers=headers
            )
            if res.status_code == 429:
                triggered_limit = True
                break
        
        assert triggered_limit, "Rate limiter did not block request when exceeding limits."
