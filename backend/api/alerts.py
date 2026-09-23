from fastapi import APIRouter, HTTPException
from backend.database import db_wrapper

router = APIRouter(tags=['alerts'])

@router.get('/patients/{patient_id}/alerts')
def get_patient_alerts(patient_id: str):
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        alerts = list(db.alerts.find({'patient_id': patient_id}, {'_id': 0}).sort('created_at', -1))
        return alerts
    else:
        alerts = [a for a in db_wrapper._in_memory_store.get('alerts', []) if a.get('patient_id') == patient_id]
        alerts.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return alerts

@router.post('/alerts/{alert_id}/review')
def review_alert(alert_id: str):
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        res = db.alerts.update_one({'id': alert_id}, {'$set': {'reviewed': True}})
        if res.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found.")
    else:
        alerts = db_wrapper._in_memory_store.get('alerts', [])
        found = False
        for a in alerts:
            if a.get('id') == alert_id:
                a['reviewed'] = True
                found = True
        if not found:
            raise HTTPException(status_code=404, detail="Alert not found.")
            
    return {'status': 'success', 'message': 'Alert marked as reviewed.'}
