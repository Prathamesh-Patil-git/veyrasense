import json
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """VeyraSense Gateway Application Settings."""

    PROJECT_NAME: str = "VeyraSense API"
    VERSION: str = "0.3.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Base directory of the repository
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = Field(default=Path("data"))

    # Database URL
    DATABASE_URL: str = ""
    SQLITE_BUSY_TIMEOUT_MS: int = 5000

    # Security & Tokens
    SECRET_KEY: str = "veyrasense-dev-secret-change-in-production-only-32bytesmin"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours shift

    # CORS configuration
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    # Dev Seed Credentials
    DEV_ADMIN_EMAIL: str = "admin@veyrasense.local"
    DEV_ADMIN_PASSWORD: str = "VeyraSense2026!"
    DEV_ADMIN_NAME: str = "VeyraSense Operations Lead"

    # MQTT & Mosquitto Provisioning
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_BACKEND_USERNAME: str = "veyrasense_backend"
    MQTT_BACKEND_PASSWORD: str = "veyrasense_internal_backend_key_secure"
    MOSQUITTO_CONFIG_DIR: Path = Field(default=Path("data/mosquitto"))

    # Production Server & Process Tuning
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    WORKERS: int = 2
    LOG_DIR: Path = Field(default=Path("logs"))
    MODELS_DIR: Path = Field(default=Path("models"))
    BACKUPS_DIR: Path = Field(default=Path("backups"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, str) and v.startswith("["):
            try:
                return json.loads(v)
            except Exception:
                return ["http://localhost:5173"]
        return v

    @property
    def resolved_data_dir(self) -> Path:
        """Ensure persistent data directory is resolved and exists."""
        target = self.DATA_DIR
        if not target.is_absolute():
            target = self.BASE_DIR / target
        target.mkdir(parents=True, exist_ok=True)
        return target

    @property
    def database_path(self) -> Path:
        """Absolute Path to the primary SQLite database file."""
        return self.resolved_data_dir / "veyrasense.db"

    @property
    def resolved_database_url(self) -> str:
        """Resolve database URL with explicit SQLite file in persistent directory."""
        if self.DATABASE_URL:
            return self.DATABASE_URL
        return f"sqlite:///{self.database_path.as_posix()}"

    @property
    def resolved_mosquitto_dir(self) -> Path:
        """Ensure persistent Mosquitto directory exists for ACL & credentials."""
        target = self.MOSQUITTO_CONFIG_DIR
        if not target.is_absolute():
            target = self.BASE_DIR / target
        target.mkdir(parents=True, exist_ok=True)
        return target

    @property
    def mosquitto_passwd_path(self) -> Path:
        return self.resolved_mosquitto_dir / "mosquitto_passwd"

    @property
    def mosquitto_acl_path(self) -> Path:
        return self.resolved_mosquitto_dir / "mosquitto.acl"

    @property
    def mosquitto_conf_path(self) -> Path:
        return self.resolved_mosquitto_dir / "veyrasense.conf"

    @property
    def resolved_log_dir(self) -> Path:
        """Ensure persistent log directory exists outside release directory."""
        target = self.LOG_DIR
        if not target.is_absolute():
            target = self.BASE_DIR / target
        target.mkdir(parents=True, exist_ok=True)
        return target

    @property
    def resolved_models_dir(self) -> Path:
        """Ensure persistent ML model directory exists outside release directory."""
        target = self.MODELS_DIR
        if not target.is_absolute():
            target = self.BASE_DIR / target
        target.mkdir(parents=True, exist_ok=True)
        return target

    @property
    def resolved_backups_dir(self) -> Path:
        """Ensure pre-migration database backup directory exists."""
        target = self.BACKUPS_DIR
        if not target.is_absolute():
            target = self.BASE_DIR / target
        target.mkdir(parents=True, exist_ok=True)
        return target


settings = Settings()
