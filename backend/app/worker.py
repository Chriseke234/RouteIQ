import asyncio
from celery import Celery
import logging
from uuid import UUID

from app.config import settings
from app.database.session import async_session_factory

logger = logging.getLogger(__name__)

# Initialize Celery Application
celery_app = Celery(
    "routeiq_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

# Optional configuration overrides
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
)

@celery_app.task(name="optimize_vrp_route_task")
def optimize_vrp_route_task(trip_id_str: str):
    """
    Celery background task to trigger route optimization.
    Wraps the async database transaction inside an event loop.
    """
    logger.info(f"Starting route optimization for trip: {trip_id_str}")
    
    trip_id = UUID(trip_id_str)
    
    # Run async function using asyncio.run
    async def run_optimization():
        from app.services.routing import optimize_trip_route
        async with async_session_factory() as session:
            try:
                res = await optimize_trip_route(session, trip_id)
                logger.info(f"Route optimization completed successfully: {res}")
                return res
            except Exception as e:
                logger.error(f"Error optimizing route: {str(e)}", exc_info=True)
                raise e

    # Execute inside a new event loop
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # Fallback if loop is already running in this thread
        import nest_asyncio
        nest_asyncio.apply()
        return loop.run_until_complete(run_optimization())
    else:
        return asyncio.run(run_optimization())
