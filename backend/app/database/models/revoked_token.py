from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base, utc_now


class RevokedToken(Base):
    """Persistent storage for revoked/logged-out JWT tokens in SQLite.

    Pruned periodically based on expires_at.
    """

    __tablename__ = "revoked_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    jti: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
        nullable=False,
    )
