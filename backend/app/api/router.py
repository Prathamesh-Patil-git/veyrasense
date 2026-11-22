from fastapi import APIRouter
from app.api.routes import (
    health,
    auth,
    departments,
    nodes,
    sensor_profiles,
    measurements,
    dashboard,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(departments.router)
api_router.include_router(nodes.router)
api_router.include_router(sensor_profiles.router)
api_router.include_router(measurements.router)
api_router.include_router(dashboard.router)
