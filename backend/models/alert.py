from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class CaregiverAlert(BaseModel):
    id: str
    patient_id: str
    alert_type: str  # PERFORMANCE_CHANGE, LOW_ACTIVITY, REPEATED_DIFFICULTY, UNUSUAL_RESPONSE_TIME
    title: str
    message: str
    reviewed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
