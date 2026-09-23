from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from backend.models.activity import ActivityResult
from backend.services.activity_service import add_activity_result, get_patient_activities

router = APIRouter(tags=['activities'])

@router.post('/activities/result')
def submit_activity_result(payload: ActivityResult):
    try:
        saved = add_activity_result(payload)
        return {'status': 'success', 'data': saved}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f'Failed to store activity result: {str(e)}')

@router.get('/patients/{patient_id}/activities')
def list_patient_activities(
    patient_id: str,
    activity_type: Optional[str] = Query(None, description="Filter by activity: picture_recall, family_memory, matching, all"),
    days: Optional[int] = Query(None, description="Filter by recent days e.g. 7 or 30")
):
    records = get_patient_activities(patient_id, activity_type=activity_type, days=days)
    return {'patient_id': patient_id, 'count': len(records), 'activities': records}
