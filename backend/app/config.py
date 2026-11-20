import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    BASE_DIR: Path = BASE_DIR
    PROJECT_NAME: str = "Ankur Backend API"
    PROJECT_TAGLINE: str = "Growing with you."
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/agripilot.db")
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "agripilot_bd_production_secure_secret_key_2026_bd")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # File Storage
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    MAX_IMAGE_SIZE_BYTES: int = 8 * 1024 * 1024  # 8 MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # ML Models
    MODELS_DIR: Path = BASE_DIR / "models_weights"
    
    # Weather & External Cache
    WEATHER_CACHE_TTL_SECONDS: int = 3600  # 1 hour
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
