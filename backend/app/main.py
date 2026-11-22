import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.database.connection import engine
from app.database.base import Base
# Import all models to ensure metadata is fully populated
import app.database.models  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("veyrasense")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Initializing VeyraSense Edge Gateway Backend...")
    # Ensure tables exist in development SQLite
    settings.resolved_data_dir
    Base.metadata.create_all(bind=engine)
    logger.info(f"SQLite database ready at: {settings.resolved_database_url}")
    # Auto-seed standard industrial departments if none exist
    try:
        from app.database.connection import SessionLocal
        from app.database.models.department import Department
        from sqlalchemy import select, func
        with SessionLocal() as db:
            count = db.scalar(select(func.count(Department.id))) or 0
            if count == 0:
                logger.info("Initializing core industrial departments in database...")
                core_depts = [
                    ("Production", "Continuous chemical synthesis, assembly lines, and reactor vessel monitoring"),
                    ("Quality Control", "Precision dimension, purity, acoustic ringdown, and tolerance verification"),
                    ("Maintenance", "Predictive machinery vibration, pump wear, and bearing degradation analysis"),
                    ("Utilities", "Hydraulic drainage networks, cooling towers, power distribution, and manholes"),
                    ("Storage & Warehouse", "Ambient environmental climate, cold chain storage, and sealed vessel integrity"),
                    ("Environmental Monitoring", "Toxic gas emission detection, stormwater runoff, and ambient atmospheric quality"),
                    ("Research & Development", "Experimental AIoT sensor challenge-response validation testbed"),
                ]
                for name, desc in core_depts:
                    db.add(Department(name=name, description=desc, is_active=True))
                db.commit()
                logger.info("7 core industrial departments initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize core departments at startup: {e}")
    # Sync initial Mosquitto configuration and per-node ACLs
    try:
        from app.database.connection import SessionLocal
        from app.services.mosquitto_service import MosquittoProvisioningService
        with SessionLocal() as db:
            MosquittoProvisioningService.sync_mosquitto_configuration(db)
    except Exception as e:
        logger.warning(f"Could not sync Mosquitto configuration at startup: {e}")
    yield
    logger.info("Shutting down VeyraSense Edge Gateway Backend.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Industrial IoT Sensor Reliability Platform — Edge Gateway API",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Root"])
def root():
    """Root metadata endpoint."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "documentation": f"{settings.API_V1_PREFIX}/docs",
        "health_endpoint": f"{settings.API_V1_PREFIX}/health",
        "hardware_target": "Raspberry Pi 5 (4GB RAM, 64GB Storage, Local SQLite, Mosquitto MQTT)",
    }
