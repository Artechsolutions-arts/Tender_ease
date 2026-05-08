import logging
import os
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import FRONTEND_URL, UPLOADS_DIR, IS_PRODUCTION
from app.routers import auth, tenders, vendors, bids, ai, documents, notifications, reports

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("ap_eprocurement")

os.makedirs(UPLOADS_DIR, exist_ok=True)

limiter = Limiter(key_func=get_remote_address, default_limits=["150/minute"])

# Disable interactive API docs in production (information exposure)
_docs_url  = None if IS_PRODUCTION else "/api/docs"
_redoc_url = None

app = FastAPI(
    title="AP e-Procurement API",
    version="2.0.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
_allowed_origins = [FRONTEND_URL]
if not IS_PRODUCTION:
    _allowed_origins += ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


# ── Global error handlers ─────────────────────────────────────────────────────

@app.exception_handler(SQLAlchemyError)
async def db_error_handler(request: Request, exc: SQLAlchemyError):
    logger.error("Database error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=503,
        content={"error": "Database temporarily unavailable. Please try again shortly."},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Return structured errors without exposing internals
    errors = [
        {"field": ".".join(str(loc) for loc in e["loc"][1:]), "message": e["msg"]}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"error": "Validation failed", "details": errors})


@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": "An internal error occurred. Please contact the system administrator."},
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "AP e-Procurement API",
        "environment": "production" if IS_PRODUCTION else "development",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


app.include_router(auth.router,          prefix="/api/auth",          tags=["auth"])
app.include_router(tenders.router,       prefix="/api/tenders",       tags=["tenders"])
app.include_router(vendors.router,       prefix="/api/vendors",       tags=["vendors"])
app.include_router(bids.router,          prefix="/api/bids",          tags=["bids"])
app.include_router(ai.router,            prefix="/api/ai",            tags=["ai"])
app.include_router(documents.router,     prefix="/api/documents",     tags=["documents"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(reports.router,       prefix="/api/reports",       tags=["reports"])


@app.exception_handler(404)
async def not_found(request: Request, _exc):
    return JSONResponse(
        status_code=404,
        content={"error": f"Endpoint {request.method} {request.url.path} not found"},
    )
