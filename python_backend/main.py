from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime, timezone

# Absolute imports from the backend package
from python_backend.core.config import get_settings
from python_backend.routers import auth, exam, violations, admin, ingest, leaderboard

settings = get_settings()

app = FastAPI(
    title="ExamGuard API",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Standard health check
@app.get("/api/health")
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# Mount routers with /api prefix for Vercel compatibility
app.include_router(auth.router,        prefix="/api")
app.include_router(exam.router,        prefix="/api")
app.include_router(violations.router,  prefix="/api")
app.include_router(admin.router,       prefix="/api")
app.include_router(ingest.router,      prefix="/api")
app.include_router(leaderboard.router, prefix="/api")

# Fallback routes
app.include_router(auth.router)
app.include_router(exam.router)
app.include_router(violations.router)
app.include_router(admin.router)
app.include_router(ingest.router)
app.include_router(leaderboard.router)

@app.get("/api")
@app.get("/")
async def root():
    return {"message": "Backend Active"}
