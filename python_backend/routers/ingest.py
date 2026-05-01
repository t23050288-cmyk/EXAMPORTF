from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List, Optional
from python_backend.core.config import get_settings
from python_backend.routers.admin import verify_admin
from python_backend.db.supabase_client import get_supabase
import pandas as pd
import io

router = APIRouter(prefix="/admin/ingest", tags=["ingest"])
settings = get_settings()

@router.get("/folders")
async def list_folders(_: bool = Depends(verify_admin)):
    supabase = get_supabase()
    res = supabase.table("questions").select("exam_identity").execute()
    folders = sorted(list(set(r["exam_identity"] for r in res.data if r.get("exam_identity"))))
    return {"folders": folders}

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    exam_identity: str = "default",
    _: bool = Depends(verify_admin)
):
    try:
        content = await file.read()
        return {"status": "success", "message": f"File {file.filename} received for folder {exam_identity}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
