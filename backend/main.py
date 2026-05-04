import os
from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import FRONTEND_URL, UPLOADS_DIR
from app.routers import auth, tenders, vendors, bids, ai, documents, notifications, reports

os.makedirs(UPLOADS_DIR, exist_ok=True)

limiter = Limiter(key_func=get_remote_address, default_limits=["150/minute"])

app = FastAPI(title="AP e-Procurement API", version="2.0.0", docs_url="/api/docs", redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok", "service": "AP e-Procurement API (Python)", "timestamp": datetime.now(timezone.utc).isoformat()}


app.include_router(auth.router,          prefix="/api/auth",          tags=["auth"])
app.include_router(tenders.router,       prefix="/api/tenders",       tags=["tenders"])
app.include_router(vendors.router,       prefix="/api/vendors",       tags=["vendors"])
app.include_router(bids.router,          prefix="/api/bids",          tags=["bids"])
app.include_router(ai.router,            prefix="/api/ai",            tags=["ai"])
app.include_router(documents.router,     prefix="/api/documents",     tags=["documents"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(reports.router,       prefix="/api/reports",       tags=["reports"])


@app.exception_handler(404)
async def not_found(_req: Request, _exc):
    return JSONResponse(status_code=404, content={"error": f"Route {_req.method} {_req.url.path} not found"})
