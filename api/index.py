from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import sys
from datetime import datetime, timezone

# Add the current directory to path for relative imports to work as absolute if needed
sys.path.append(os.path.dirname(__file__))

# Import from the same folder
from .core.config import get_settings
from .routers import admin, ingest, auth, exam, violations, leaderboard

settings = get_settings()

app = FastAPI(title="ExamGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

# Standard routes
app.include_router(admin.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(exam.router, prefix="/api")
app.include_router(violations.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")

# Fallback for direct calls
app.include_router(admin.router)
app.include_router(ingest.router)
app.include_router(auth.router)
app.include_router(exam.router)
app.include_router(violations.router)
app.include_router(leaderboard.router)

@app.get("/api")
@app.get("/")
async def root():
    return {"message": "API Active"}
