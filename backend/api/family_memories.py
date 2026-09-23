import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from backend.database import db_wrapper
from backend.models.family_memory import FamilyMemory, FamilyMemoryCreate

router = APIRouter(prefix='/patients', tags=['family-memories'])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / 'uploads' / 'family'
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

@router.get('/{patient_id}/family-memories')
def get_family_memories(patient_id: str):
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        memories = list(db.family_memories.find({'patient_id': patient_id}, {'_id': 0}))
        return memories
    else:
        memories = [m for m in db_wrapper._in_memory_store.get('family_memories', []) if m.get('patient_id') == patient_id]
        return memories

@router.post('/{patient_id}/family-memories')
def add_family_memory(patient_id: str, payload: FamilyMemoryCreate):
    mem_id = str(uuid.uuid4())
    memory = {
        'id': mem_id,
        'patient_id': patient_id,
        'name': payload.name,
        'relationship': payload.relationship,
        'description': payload.description,
        'photo_url': payload.photo_url or "👨‍👩‍👧‍👦",
        'created_at': datetime.now().isoformat()
    }
    
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        db.family_memories.insert_one(dict(memory))
    else:
        db_wrapper._in_memory_store['family_memories'].append(dict(memory))
        
    return memory

@router.post('/{patient_id}/family-memories/upload')
async def upload_family_memory(
    patient_id: str,
    name: str = Form(...),
    relationship: str = Form(...),
    description: str = Form(...),
    file: UploadFile = File(...)
):
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Please enter the family member's name.")
    if not relationship or not relationship.strip():
        raise HTTPException(status_code=400, detail="Please select/enter the relationship.")
        
    ext = Path(file.filename or '').suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image file format. Supported formats: JPG, JPEG, PNG, WebP.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Image file size exceeds the 5 MB limit. Please select a smaller photo.")

    filename = f"{patient_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = UPLOAD_DIR / filename
    
    with open(filepath, 'wb') as f:
        f.write(contents)

    photo_url = f"/uploads/family/{filename}"
    mem_id = str(uuid.uuid4())

    memory = {
        'id': mem_id,
        'patient_id': patient_id,
        'name': name.strip(),
        'relationship': relationship.strip(),
        'description': description.strip() if description else '',
        'photo_url': photo_url,
        'is_uploaded': True,
        'created_at': datetime.now().isoformat()
    }

    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        db.family_memories.insert_one(dict(memory))
    else:
        db_wrapper._in_memory_store['family_memories'].append(dict(memory))

    return memory

@router.delete('/{patient_id}/family-memories/{mem_id}')
def delete_family_memory(patient_id: str, mem_id: str):
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        memory = db.family_memories.find_one({'patient_id': patient_id, 'id': mem_id})
        if memory and memory.get('photo_url', '').startswith('/uploads/family/'):
            fname = memory['photo_url'].replace('/uploads/family/', '')
            fpath = UPLOAD_DIR / fname
            if fpath.exists():
                try:
                    os.remove(fpath)
                except Exception:
                    pass

        res = db.family_memories.delete_one({'patient_id': patient_id, 'id': mem_id})
        if res.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Family memory record not found.")
    else:
        store = db_wrapper._in_memory_store.get('family_memories', [])
        for m in store:
            if m.get('patient_id') == patient_id and m.get('id') == mem_id:
                if m.get('photo_url', '').startswith('/uploads/family/'):
                    fname = m['photo_url'].replace('/uploads/family/', '')
                    fpath = UPLOAD_DIR / fname
                    if fpath.exists():
                        try:
                            os.remove(fpath)
                        except Exception:
                            pass
        db_wrapper._in_memory_store['family_memories'] = [m for m in store if not (m.get('patient_id') == patient_id and m.get('id') == mem_id)]
        
    return {'status': 'success', 'message': 'Family memory record removed.'}
