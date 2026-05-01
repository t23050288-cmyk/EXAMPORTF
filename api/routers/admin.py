from fastapi import APIRouter, HTTPException, status, Header, Depends
from ..core.config import get_settings
from ..db.supabase_client import get_supabase

router = APIRouter(prefix="/admin", tags=["admin"])
settings = get_settings()

async def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=401, detail="Invalid secret")
    return True

@router.get("/students")
async def students(_: bool = Depends(verify_admin)):
    supabase = get_supabase()
    return supabase.table("students").select("*").execute().data

@router.get("/questions")
async def questions(_: bool = Depends(verify_admin)):
    supabase = get_supabase()
    return {"questions": supabase.table("questions").select("*").execute().data}
