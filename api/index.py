import os
import sys

# Add the project root to sys.path
api_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(api_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from python_backend.main import app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    app = FastAPI()
    @app.get("/{path:path}")
    async def error(path: str):
        return JSONResponse(status_code=500, content={"error": str(e)})
