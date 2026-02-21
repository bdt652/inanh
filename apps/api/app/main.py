import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.routes import router as v1_router
from app.api.v1.schemas import HealthResponse
from app.core.config import settings
from app.core.storage import StorageUnavailableError, ensure_storage_ready, load_object_bytes
from app.core.uploads import UPLOADS_ROUTE_PREFIX
from app.db.mongo import ensure_indexes, get_db, ping_database

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await asyncio.wait_for(ensure_indexes(), timeout=2.0)
    except Exception:
        logger.warning("Skipping Mongo index initialization because database is not reachable.")
    try:
        await asyncio.wait_for(asyncio.to_thread(ensure_storage_ready), timeout=3.0)
    except Exception:
        logger.warning("Skipping storage initialization because storage service is not reachable.")
    yield


app = FastAPI(
    title="Inanh24h API",
    description="Swagger docs for testing Inanh24h backend endpoints.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={"displayRequestDuration": True, "tryItOutEnabled": True},
    openapi_tags=[
        {"name": "system", "description": "System and health-check endpoints."},
        {"name": "admin", "description": "Admin authentication endpoints."},
        {"name": "content", "description": "Static content endpoints used by frontend."},
        {"name": "products", "description": "Product browsing and demo product creation."},
    ],
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get(f"{UPLOADS_ROUTE_PREFIX}" + "/{object_path:path}", tags=["content"], summary="Serve uploaded media")
async def get_uploaded_media(object_path: str) -> Response:
    if not object_path.strip():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded file not found.")
    try:
        body, media_type = await asyncio.to_thread(load_object_bytes, object_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Uploaded file not found.") from exc
    except StorageUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Storage service is not available.",
        ) from exc
    return Response(content=body, media_type=media_type)


@app.get("/health", response_model=HealthResponse, tags=["system"], summary="Health check")
async def health(db: AsyncIOMotorDatabase = Depends(get_db)) -> HealthResponse:
    try:
        await ping_database(db)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not reachable.",
        ) from exc
    return HealthResponse(ok=True)


app.include_router(v1_router, prefix="/api/v1")
