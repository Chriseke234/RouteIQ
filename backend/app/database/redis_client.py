from datetime import datetime
import redis.asyncio as aioredis
from app.config import settings

class RedisManager:
    def __init__(self):
        self.redis_client: aioredis.Redis = None

    def connect(self):
        self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

    async def disconnect(self):
        if self.redis_client:
            await self.redis_client.close()

    async def is_blacklisted(self, jti: str) -> bool:
        if not self.redis_client:
            return False
        val = await self.redis_client.get(f"blacklist:{jti}")
        return val is not None

    async def blacklist_token(self, jti: str, expires_in_seconds: int):
        if self.redis_client:
            await self.redis_client.setex(f"blacklist:{jti}", expires_in_seconds, "1")

    async def check_rate_limit(self, client_id: str, limit: int = 100, window_seconds: int = 60) -> bool:
        """
        Implements a sliding window rate limiter in Redis.
        Returns True if the rate limit is NOT exceeded (request allowed), False otherwise.
        """
        if not self.redis_client:
            return True  # Fallback: allow requests if Redis is unavailable
            
        key = f"rate_limit:{client_id}"
        async with self.redis_client.pipeline(transaction=True) as pipe:
            now = datetime.utcnow().timestamp()
            clear_before = now - window_seconds
            
            # Remove coordinates outside current window
            await pipe.zremrangebyscore(key, 0, clear_before)
            # Add current request timestamp
            await pipe.zadd(key, {str(now): now})
            # Get total requests in the window
            await pipe.zcard(key)
            # Set key expiration to prevent leaks
            await pipe.expire(key, window_seconds)
            
            _, _, request_count, _ = await pipe.execute()
            
        return request_count <= limit

redis_manager = RedisManager()
