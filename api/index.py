import os
import sys

# Standard Vercel Python entry point logic
# We add the 'api' directory to the path so that we can import its subfolders
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

try:
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    from datetime import datetime, timezone
    
    # Imports using the now-added path
    from core.config import get_settings
    from routers import admin, ingest, auth, exam, violations, leaderboard

    settings = get_settings()
    app = FastAPI(title="ExamGuard API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Temporarily broad for debugging
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    async def health():
        return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}

    # Mount routers
    app.include_router(admin.router, prefix="/api")
    app.include_router(ingest.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(exam.router, prefix="/api")
    app.include_router(violations.router, prefix="/api")
    app.include_router(leaderboard.router, prefix="/api")

    # Fallback
    app.include_router(admin.router)
    app.include_router(ingest.router)

    @app.get("/api")
    @app.get("/")
    async def root():
        return {"message": "Backend Ready"}

except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    import traceback
    app = FastAPI()
    @app.get("/{path:path}")
    async def error_handler(path: str):
        return JSONResponse(
            status_code=500, 
            content={
                "error": "Initialization Failed",
                "detail": str(e),
                "trace": traceback.format_exc()
            }
        )
