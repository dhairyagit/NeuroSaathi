from typing import Dict, Any
from backend.services.activity_service import get_patient_activities
from ml.recommender import recommend_next_activity

def get_recommendation_for_patient(patient_id: str, age_group: str = '70-74') -> Dict[str, Any]:
    records = get_patient_activities(patient_id)
    rec = recommend_next_activity(records, age_group=age_group)
    return rec
