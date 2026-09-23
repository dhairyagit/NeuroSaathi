from typing import List, Optional
from pydantic import BaseModel, Field

class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1)
    age: int = Field(..., ge=18, le=120)
    preferred_language: str = 'English'
    caregiver_name: str = 'Caregiver'
    interests: Optional[List[str]] = []
    is_demo: bool = False
    voice_guidance_enabled: bool = True
    difficulty_preference: str = 'adaptive'

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    preferred_language: Optional[str] = None
    caregiver_name: Optional[str] = None
    interests: Optional[List[str]] = None
    voice_guidance_enabled: Optional[bool] = None
    difficulty_preference: Optional[str] = None

class Patient(BaseModel):
    id: str
    name: str
    age: int
    preferred_language: str
    caregiver_name: str
    interests: List[str]
    is_demo: bool = True
    voice_guidance_enabled: bool = True
    difficulty_preference: str = 'adaptive'
