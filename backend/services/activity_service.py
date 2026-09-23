import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from backend.database import db_wrapper
from backend.models.activity import ActivityResult
from ml.anomaly_detector import analyze_patient_anomaly

DEMO_PATIENTS = {
    'kamla': {
        'id': 'kamla',
        'name': 'Kamla Devi',
        'age': 72,
        'preferred_language': 'Hindi',
        'caregiver_name': 'Priya Sharma',
        'interests': ['family memories', 'flowers', 'daily routine'],
        'is_demo': True,
        'voice_guidance_enabled': True,
        'difficulty_preference': 'adaptive'
    },
    'rongsen': {
        'id': 'rongsen',
        'name': 'Rongsen',
        'age': 69,
        'preferred_language': 'English',
        'caregiver_name': 'Amina',
        'interests': ['family', 'books', 'matching games'],
        'is_demo': True,
        'voice_guidance_enabled': True,
        'difficulty_preference': 'adaptive'
    }
}

def seed_demo_data_if_empty():
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        if db.patients.count_documents({}) == 0:
            for p in DEMO_PATIENTS.values():
                db.patients.insert_one(dict(p))
            
            activities = ['picture_recall', 'family_memory', 'matching']
            now = datetime.now()
            seed_records = []
            
            for i in range(32, 0, -1):
                session_time = now - timedelta(days=i * 0.9)
                act_type = activities[i % 3]
                diff = 'easy' if i > 25 else ('medium' if i > 10 else 'hard')
                
                if i == 2:
                    acc = 0.52
                    rt = 24.5
                    mistakes = 3
                else:
                    acc = round(min(0.96, max(0.65, 0.78 + (32 - i) * 0.003 + random.uniform(-0.06, 0.06))), 2)
                    rt = round(random.uniform(8.0, 18.0), 2)
                    mistakes = max(0, int(round((1 - acc) * 3)))

                rec = {
                    'patient_id': 'kamla',
                    'activity_type': act_type,
                    'difficulty': diff,
                    'accuracy': acc,
                    'score': round(acc * 100, 1),
                    'response_time_seconds': rt,
                    'attempts': 1,
                    'mistakes': mistakes,
                    'completion_status': 1,
                    'session_number': 33 - i,
                    'timestamp': session_time.isoformat(),
                    'memory_score': round(acc * 90 + random.uniform(2, 8), 1),
                    'attention_score': round(max(0, 100 - rt * 2.5), 1),
                    'recognition_score': round(acc * 92 + random.uniform(1, 5), 1),
                    'items_shown': 4 if act_type == 'picture_recall' else None,
                    'items_correct': int(round(acc * 4)) if act_type == 'picture_recall' else None,
                    'questions': 3 if act_type == 'family_memory' else None,
                    'correct_answers': int(round(acc * 3)) if act_type == 'family_memory' else None,
                    'pairs': 4 if act_type == 'matching' else None,
                    'moves': 6 if act_type == 'matching' else None,
                    'matches': int(round(acc * 4)) if act_type == 'matching' else None,
                }
                seed_records.append(rec)
            db.activities.insert_many(seed_records)
            
            memories = [
                {'id': 'mem-1', 'patient_id': 'kamla', 'name': 'Anjali', 'relationship': 'Daughter', 'description': 'Lives in Guwahati, visits on weekends', 'photo_url': '👩‍👧', 'created_at': now.isoformat()},
                {'id': 'mem-2', 'patient_id': 'kamla', 'name': 'Aarav', 'relationship': 'Grandson', 'description': 'Loves playing cricket and drawing', 'photo_url': '👦', 'created_at': now.isoformat()},
                {'id': 'mem-3', 'patient_id': 'kamla', 'name': 'Ramesh', 'relationship': 'Son', 'description': 'Engineers in Bengaluru, calls every evening', 'photo_url': '👨‍👦', 'created_at': now.isoformat()}
            ]
            db.family_memories.insert_many(memories)

            alert = {
                'id': str(uuid.uuid4()),
                'patient_id': 'kamla',
                'alert_type': 'PERFORMANCE_CHANGE',
                'title': 'Noticeable Performance Change Detected',
                'message': 'Picture Recall performance (52%) was lower than Kamla\'s recent personal baseline (81%).',
                'reviewed': False,
                'created_at': (now - timedelta(days=1.5)).isoformat()
            }
            db.alerts.insert_one(alert)

    else:
        store = db_wrapper._in_memory_store
        if not store['patients']:
            store['patients'] = list(DEMO_PATIENTS.values())
            now = datetime.now()
            activities = ['picture_recall', 'family_memory', 'matching']
            for i in range(32, 0, -1):
                session_time = now - timedelta(days=i * 0.9)
                act_type = activities[i % 3]
                diff = 'easy' if i > 25 else ('medium' if i > 10 else 'hard')
                if i == 2:
                    acc = 0.52
                    rt = 24.5
                    mistakes = 3
                else:
                    acc = round(min(0.96, max(0.65, 0.78 + (32 - i) * 0.003 + random.uniform(-0.06, 0.06))), 2)
                    rt = round(random.uniform(8.0, 18.0), 2)
                    mistakes = max(0, int(round((1 - acc) * 3)))

                rec = {
                    'patient_id': 'kamla',
                    'activity_type': act_type,
                    'difficulty': diff,
                    'accuracy': acc,
                    'score': round(acc * 100, 1),
                    'response_time_seconds': rt,
                    'attempts': 1,
                    'mistakes': mistakes,
                    'completion_status': 1,
                    'session_number': 33 - i,
                    'timestamp': session_time.isoformat(),
                    'memory_score': round(acc * 90 + random.uniform(2, 8), 1),
                    'attention_score': round(max(0, 100 - rt * 2.5), 1),
                    'recognition_score': round(acc * 92 + random.uniform(1, 5), 1),
                    'items_shown': 4 if act_type == 'picture_recall' else None,
                    'items_correct': int(round(acc * 4)) if act_type == 'picture_recall' else None,
                    'questions': 3 if act_type == 'family_memory' else None,
                    'correct_answers': int(round(acc * 3)) if act_type == 'family_memory' else None,
                    'pairs': 4 if act_type == 'matching' else None,
                    'moves': 6 if act_type == 'matching' else None,
                    'matches': int(round(acc * 4)) if act_type == 'matching' else None,
                }
                store['activities'].append(rec)

            store['family_memories'] = [
                {'id': 'mem-1', 'patient_id': 'kamla', 'name': 'Anjali', 'relationship': 'Daughter', 'description': 'Lives in Guwahati, visits on weekends', 'photo_url': '👩‍👧', 'created_at': now.isoformat()},
                {'id': 'mem-2', 'patient_id': 'kamla', 'name': 'Aarav', 'relationship': 'Grandson', 'description': 'Loves playing cricket and drawing', 'photo_url': '👦', 'created_at': now.isoformat()},
                {'id': 'mem-3', 'patient_id': 'kamla', 'name': 'Ramesh', 'relationship': 'Son', 'description': 'Engineers in Bengaluru, calls every evening', 'photo_url': '👨‍👦', 'created_at': now.isoformat()}
            ]
            store['alerts'] = [{
                'id': str(uuid.uuid4()),
                'patient_id': 'kamla',
                'alert_type': 'PERFORMANCE_CHANGE',
                'title': 'Noticeable Performance Change Detected',
                'message': 'Picture Recall performance (52%) was lower than Kamla\'s recent personal baseline (81%).',
                'reviewed': False,
                'created_at': (now - timedelta(days=1.5)).isoformat()
            }]

seed_demo_data_if_empty()

def add_activity_result(payload: ActivityResult) -> Dict[str, Any]:
    data = payload.model_dump()
    data['timestamp'] = data.get('timestamp') or datetime.now().isoformat()
    
    if not data.get('score'):
        data['score'] = round(data['accuracy'] * 100.0, 1)
    if not data.get('memory_score'):
        data['memory_score'] = round(data['accuracy'] * 90.0 + random.uniform(2, 8), 1)
    if not data.get('attention_score'):
        data['attention_score'] = round(max(0, 100 - float(data['response_time_seconds']) * 2.2), 1)
    if not data.get('recognition_score'):
        data['recognition_score'] = round(data['accuracy'] * 92.0 + random.uniform(1, 5), 1)

    patient_id = data['patient_id']
    history = get_patient_activities(patient_id)
    data['session_number'] = len(history) + 1

    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        db.activities.insert_one(dict(data))
    else:
        db_wrapper._in_memory_store['activities'].append(dict(data))

    anomaly_result = analyze_patient_anomaly(history, data)
    if anomaly_result.get('anomaly_detected'):
        alert_item = {
            'id': str(uuid.uuid4()),
            'patient_id': patient_id,
            'alert_type': 'PERFORMANCE_CHANGE',
            'title': 'Noticeable Performance Change Detected',
            'message': anomaly_result.get('message'),
            'reviewed': False,
            'created_at': datetime.now().isoformat()
        }
        if db_wrapper.connected and db is not None:
            db.alerts.insert_one(alert_item)
        else:
            db_wrapper._in_memory_store['alerts'].append(alert_item)

    data['anomaly_eval'] = anomaly_result
    return data

def get_patient_activities(patient_id: str, activity_type: Optional[str] = None, days: Optional[int] = None) -> List[Dict[str, Any]]:
    db = db_wrapper.db
    if db_wrapper.connected and db is not None:
        query: Dict[str, Any] = {'patient_id': patient_id}
        if activity_type and activity_type != 'all':
            query['activity_type'] = activity_type
        if days and days > 0:
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            query['timestamp'] = {'$gte': cutoff}
        cursor = db.activities.find(query, {'_id': 0}).sort('timestamp', 1)
        return list(cursor)
    else:
        records = [item for item in db_wrapper._in_memory_store['activities'] if item.get('patient_id') == patient_id]
        if activity_type and activity_type != 'all':
            records = [item for item in records if item.get('activity_type') == activity_type]
        if days and days > 0:
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            records = [item for item in records if item.get('timestamp', '') >= cutoff]
        records.sort(key=lambda x: x.get('timestamp', ''))
        return records
