import uuid
import hashlib
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Header, Depends

from backend.database import db_wrapper
from backend.models.auth import CaregiverLogin, CaregiverRegister, CaregiverUser

router = APIRouter(prefix='/auth/caregiver', tags=['auth'])

# Simple token storage for demo sessions
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode('utf-8')).hexdigest()

DEMO_CAREGIVER = {
    'id': 'cg-priya',
    'name': 'Priya Sharma',
    'email': 'priya@neurosaathi.in',
    'mobile': '9876543210',
    'password_hash': hash_password('password123'),
    'created_at': datetime.now().isoformat()
}

def seed_demo_caregiver_if_empty():
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        if db.caregivers.count_documents({}) == 0:
            db.caregivers.insert_one(dict(DEMO_CAREGIVER))
    else:
        store = db_wrapper._in_memory_store
        if 'caregivers' not in store:
            store['caregivers'] = []
        if not store['caregivers']:
            store['caregivers'].append(dict(DEMO_CAREGIVER))

seed_demo_caregiver_if_empty()

@router.post('/register')
def register_caregiver(payload: CaregiverRegister):
    email_clean = payload.email.strip().lower()
    pwd_hash = hash_password(payload.password)
    
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        existing = db.caregivers.find_one({'email': email_clean})
        if existing:
            raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
        user_id = str(uuid.uuid4())
        caregiver_data = {
            'id': user_id,
            'name': payload.name,
            'email': email_clean,
            'mobile': payload.mobile,
            'password_hash': pwd_hash,
            'created_at': datetime.now().isoformat()
        }
        db.caregivers.insert_one(caregiver_data)
    else:
        store = db_wrapper._in_memory_store.get('caregivers', [])
        for cg in store:
            if cg.get('email') == email_clean:
                raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
        user_id = str(uuid.uuid4())
        caregiver_data = {
            'id': user_id,
            'name': payload.name,
            'email': email_clean,
            'mobile': payload.mobile,
            'password_hash': pwd_hash,
            'created_at': datetime.now().isoformat()
        }
        store.append(caregiver_data)
        db_wrapper._in_memory_store['caregivers'] = store

    token = f"session-{user_id}-{uuid.uuid4().hex[:8]}"
    ACTIVE_SESSIONS[token] = {
        'id': user_id,
        'name': payload.name,
        'email': email_clean
    }
    
    return {
        'status': 'success',
        'token': token,
        'caregiver': {
            'id': user_id,
            'name': payload.name,
            'email': email_clean,
            'mobile': payload.mobile
        }
    }

@router.post('/login')
def login_caregiver(payload: CaregiverLogin):
    email_clean = payload.email.strip().lower()
    pwd_hash = hash_password(payload.password)
    
    user = None
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        user = db.caregivers.find_one({'email': email_clean, 'password_hash': pwd_hash}, {'_id': 0})
    else:
        store = db_wrapper._in_memory_store.get('caregivers', [])
        for cg in store:
            if cg.get('email') == email_clean and cg.get('password_hash') == pwd_hash:
                user = cg
                break

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    token = f"session-{user['id']}-{uuid.uuid4().hex[:8]}"
    ACTIVE_SESSIONS[token] = {
        'id': user['id'],
        'name': user['name'],
        'email': user['email']
    }

    return {
        'status': 'success',
        'token': token,
        'caregiver': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'mobile': user.get('mobile')
        }
    }

@router.post('/logout')
def logout_caregiver(authorization: str = Header(None)):
    if authorization and authorization.startswith('Bearer '):
        token = authorization.split(' ')[1]
        ACTIVE_SESSIONS.pop(token, None)
    return {'status': 'success', 'message': 'Logged out successfully.'}

@router.get('/me')
def get_current_caregiver(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(' ')[1]
    session = ACTIVE_SESSIONS.get(token)
    if not session:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return session
