from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class FamilyMemoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    relationship: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    photo_url: Optional[str] = "👨‍👩‍👧‍👦"

class FamilyMemory(BaseModel):
    id: str
    patient_id: str
    name: str
    relationship: str
    description: str
    photo_url: str = "👨‍👩‍👧‍👦"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
