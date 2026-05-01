# Vercel Deployment — ExamGuard API
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import asyncio
from datetime import datetime, timezone
import traceback

try:
    import os
    import sys
    # Ensure the api/ directory is on the Python path for absolute imports
    api_dir = os.path.dirname(os.path.abspath(__file__))
    if api_dir not in sys.path:
        sys.path.insert(0, api_dir)

    from db.supabase_client import get_supabase
    from core.config import get_settings
    from routers import auth, exam, violations, admin, ingest, leaderboard

    # ── Logging ───────────────────────────────────────────────────
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logger = logging.getLogger("examguard")

    # ── Rate Limiter ───────────────────────────────────────────────
    limiter = Limiter(key_func=get_remote_address)

    settings = get_settings()

    # ── App ───────────────────────────────────────────────────────
    # NOTE: On Vercel, requests to /api/foo will be handled by this app.
    # We mount routers with and without /api prefix for maximum compatibility.
    app = FastAPI(
        title="ExamGuard API",
        description="Online Exam System",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url=None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    @app.get("/health")
    async def health_check():
        return {"status": "ok", "version": "1.0.1-stable", "timestamp": datetime.now(timezone.utc).isoformat()}

    # ── Routers ───────────────────────────────────────────────────
    app.include_router(auth.router,        prefix="/api")
    app.include_router(exam.router,        prefix="/api")
    app.include_router(violations.router,  prefix="/api")
    app.include_router(admin.router,       prefix="/api")
    app.include_router(ingest.router,      prefix="/api")
    app.include_router(leaderboard.router, prefix="/api")

    app.include_router(auth.router)
    app.include_router(exam.router)
    app.include_router(violations.router)
    app.include_router(admin.router)
    app.include_router(ingest.router)
    app.include_router(leaderboard.router)

    @app.get("/api")
    @app.get("/")
    async def root():
        return {"message": "ExamGuard API Active"}

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Error on {request.url}: {exc}")
        return JSONResponse(status_code=500, content={"detail": str(exc)})

except Exception as e:
    app = FastAPI()
    @app.get("/api/health")
    @app.get("/health")
    async def error_health():
        return JSONResponse(status_code=500, content={"error": str(e)})
