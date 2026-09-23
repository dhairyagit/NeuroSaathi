from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class CaregiverRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
    mobile: Optional[str] = None

class CaregiverLogin(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)

class CaregiverUser(BaseModel):
    id: str
    name: str
    email: str
    mobile: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
