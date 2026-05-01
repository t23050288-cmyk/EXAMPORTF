# Vercel Entry Point
import os
import sys

# Ensure the root directory is in sys.path so we can import 'python_backend' as a package
api_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(api_dir)

if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from python_backend.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    import traceback
    
    app = FastAPI()
    @app.get("/{path:path}")
    async def catch_all(path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Backend Initialization Failed",
                "detail": str(e),
                "trace": traceback.format_exc(),
                "path_attempted": path
            }
        )
