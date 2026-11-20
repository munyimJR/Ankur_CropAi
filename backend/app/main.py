import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, seed_initial_data
from app.routers import (
    auth,
    users,
    farms,
    crop_scans,
    weather,
    overview,
    advisory,
    yield_router,
    market,
    models,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schema...")
    init_db()
    seed_initial_data()
    logger.info(f"Ankur Backend API v{settings.VERSION} ready.")
    yield
    logger.info("Shutting down Ankur Backend API.")

app = FastAPI(
    title=f"{settings.PROJECT_NAME} — {settings.PROJECT_TAGLINE}",
    version=settings.VERSION,
    description=(
        "Production backend for Ankur precision agriculture platform. Growing with you. "
        "Provides authentication, farm management, real Open-Meteo weather and climate risk analysis, "
        "and self-hosted pretrained ONNX convolutional neural network inference for crop disease identification."
    ),
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static uploaded files mount
if settings.UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")

# Health endpoints
@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Ankur API",
        "tagline": "Growing with you.",
        "version": settings.VERSION,
        "environment": "production-ready",
        "database": "connected",
        "onnxRuntime": "ready"
    }

# Register all API v1 routers
prefix = settings.API_V1_PREFIX
app.include_router(auth.router, prefix=prefix)
app.include_router(users.router, prefix=prefix)
app.include_router(farms.router, prefix=prefix)
app.include_router(crop_scans.router, prefix=prefix)
app.include_router(weather.router, prefix=prefix)
app.include_router(overview.router, prefix=prefix)
app.include_router(advisory.router, prefix=prefix)
app.include_router(yield_router.router, prefix=prefix)
app.include_router(market.router, prefix=prefix)
app.include_router(models.router, prefix=prefix)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
