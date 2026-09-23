from typing import List
from fastapi import APIRouter, HTTPException

from backend.database import db_wrapper
from backend.models.patient import Patient, PatientCreate, PatientUpdate
from backend.services.activity_service import DEMO_PATIENTS

router = APIRouter(prefix='/patients', tags=['patients'])

@router.get('')
def list_patients():
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        patients = list(db.patients.find({}, {'_id': 0}))
        if not patients:
            patients = list(DEMO_PATIENTS.values())
        return patients
    else:
        return db_wrapper._in_memory_store.get('patients', list(DEMO_PATIENTS.values()))

@router.get('/{patient_id}')
def get_patient(patient_id: str):
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        patient = db.patients.find_one({'id': patient_id}, {'_id': 0})
        if patient:
            return patient
    
    # Check in-memory store / demo fallback
    in_mem = [p for p in db_wrapper._in_memory_store.get('patients', []) if p['id'] == patient_id]
    if in_mem:
        return in_mem[0]
    
    if patient_id in DEMO_PATIENTS:
        return DEMO_PATIENTS[patient_id]
        
    raise HTTPException(status_code=404, detail='Patient profile not found.')

@router.post('')
def create_patient(payload: PatientCreate):
    patient_id = payload.name.lower().replace(' ', '-')
    patient = {
        'id': patient_id,
        'name': payload.name,
        'age': payload.age,
        'preferred_language': payload.preferred_language,
        'caregiver_name': payload.caregiver_name,
        'interests': payload.interests or [],
        'is_demo': payload.is_demo,
        'voice_guidance_enabled': payload.voice_guidance_enabled,
        'difficulty_preference': payload.difficulty_preference,
    }
    
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        db.patients.replace_one({'id': patient_id}, patient, upsert=True)
    else:
        store = db_wrapper._in_memory_store['patients']
        store = [p for p in store if p['id'] != patient_id]
        store.append(patient)
        db_wrapper._in_memory_store['patients'] = store
        
    return patient

@router.put('/{patient_id}')
def update_patient(patient_id: str, payload: PatientUpdate):
    patient = get_patient(patient_id)
    update_data = payload.model_dump(exclude_unset=True)
    
    for k, v in update_data.items():
        if v is not None:
            patient[k] = v

    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        db.patients.replace_one({'id': patient_id}, patient, upsert=True)
    else:
        store = db_wrapper._in_memory_store['patients']
        for idx, p in enumerate(store):
            if p['id'] == patient_id:
                store[idx] = patient
                
    return patient
