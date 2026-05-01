from fastapi import APIRouter, Depends
from ..core.config import get_settings
from .admin import verify_admin
from ..db.supabase_client import get_supabase

router = APIRouter(prefix="/admin/ingest", tags=["ingest"])

@router.get("/folders")
async def folders(_: bool = Depends(verify_admin)):
    supabase = get_supabase()
    res = supabase.table("questions").select("exam_identity").execute()
    return {"folders": sorted(list(set(r["exam_identity"] for r in res.data if r.get("exam_identity"))))}
