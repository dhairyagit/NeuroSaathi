from fastapi import APIRouter
from backend.services.analytics_service import get_patient_analytics

router = APIRouter(prefix='/patients', tags=['analytics'])

@router.get('/{patient_id}/analytics')
def get_analytics(patient_id: str):
    return get_patient_analytics(patient_id)

@router.get('/{patient_id}/observations')
def get_observations(patient_id: str):
    analytics = get_patient_analytics(patient_id)
    return {
        'patient_id': patient_id,
        'observations': analytics.get('observations', []),
        'disclaimer': analytics.get('disclaimer', '')
    }
