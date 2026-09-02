import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+asyncpg://routeiq_user:routeiq_password@localhost:5432/routeiq_dev")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    OSRM_URL: str = os.getenv("OSRM_URL", "http://localhost:5000")
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_routeiq_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    class Config:
        case_sensitive = True

settings = Settings()
