from fastapi import APIRouter
from backend.services.recommendation_service import get_recommendation_for_patient

router = APIRouter(prefix='/patients', tags=['recommendations'])

@router.get('/{patient_id}/recommendation')
def get_recommendation(patient_id: str):
    rec = get_recommendation_for_patient(patient_id)
    return rec
