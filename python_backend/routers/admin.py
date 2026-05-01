from fastapi import APIRouter, HTTPException, status, Header, Depends, File, UploadFile, Query
from fastapi.responses import StreamingResponse, JSONResponse
from typing import Optional
from python_backend.core.config import get_settings
from python_backend.db.supabase_client import get_supabase
from python_backend.models.schemas import (
    AdminQuestionsResponse, AdminQuestionOut,
    QuestionCreate, QuestionUpdate,
    StudentStatus, StudentCreate, StudentUpdate,
    ExamConfig, ExamConfigUpdate, FolderRenameRequest,
    FolderEditBranchRequest
)
from datetime import datetime, timezone
import io
import xlsxwriter

router = APIRouter(prefix="/admin", tags=["admin management"])
settings = get_settings()

async def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    return True

@router.get("/students")
async def get_all_students(_: bool = Depends(verify_admin)):
    supabase = get_supabase()
    res = supabase.table("students").select("*").execute()
    return res.data

@router.get("/questions", response_model=AdminQuestionsResponse)
async def get_all_questions(_: bool = Depends(verify_admin)):
    supabase = get_supabase()
    res = supabase.table("questions").select("*").execute()
    return {"questions": res.data}
