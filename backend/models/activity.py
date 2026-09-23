from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

class ActivityResult(BaseModel):
    patient_id: str
    activity_type: str  # picture_recall, family_memory, matching
    difficulty: str     # easy, medium, hard
    score: float = Field(default=0.0)
    accuracy: float = Field(..., ge=0.0, le=1.0)
    response_time_seconds: float = Field(..., ge=0.0)
    attempts: int = Field(default=1, ge=1)
    mistakes: int = Field(default=0, ge=0)
    completion_status: int = Field(default=1, ge=0, le=1)
    session_number: int = Field(default=1, ge=1)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    
    # Specific fields per game type
    items_shown: Optional[int] = None
    items_correct: Optional[int] = None
    questions: Optional[int] = None
    correct_answers: Optional[int] = None
    pairs: Optional[int] = None
    moves: Optional[int] = None
    matches: Optional[int] = None
    
    # Domain metric scores
    memory_score: Optional[float] = 0.0
    attention_score: Optional[float] = 0.0
    recognition_score: Optional[float] = 0.0
