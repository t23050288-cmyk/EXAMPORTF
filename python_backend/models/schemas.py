from pydantic import BaseModel
from typing import List, Optional

class AdminQuestionOut(BaseModel):
    id: str
    text: str
    options: List[str]
    answer: str
    exam_identity: Optional[str] = None

class AdminQuestionsResponse(BaseModel):
    questions: List[AdminQuestionOut]

class ExamConfig(BaseModel):
    id: str
    exam_name: str
    is_active: bool
