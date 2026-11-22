from datetime import datetime, timezone
from fastapi import APIRouter, status
from app.core.config import settings

router = APIRouter(tags=["Health & Status"])


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Minimal public health endpoint.

    Exposes service operational status without disclosing internal SQLite file paths,
    database pragmas, or host machine environment details.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
