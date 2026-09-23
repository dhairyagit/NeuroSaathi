import io
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from data.generate_dataset import records as synthetic_records
from ml.train_model import prepare_data
from ml.anomaly_detector import analyze_patient_anomaly
from ml.recommender import recommend_next_activity

client = TestClient(app)

def test_health_check():
    response = client.get('/api/health')
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'ok'

def test_patients_api():
    # Get patients list
    response = client.get('/api/patients')
    assert response.status_code == 200
    patients = response.json()
    assert len(patients) >= 1
    
    # Get demo patient
    response = client.get('/api/patients/kamla')
    assert response.status_code == 200
    patient = response.json()
    assert patient['name'] == 'Kamla Devi'

def test_caregiver_auth_api():
    # Test Demo Caregiver Login
    login_payload = {
        'email': 'priya@neurosaathi.in',
        'password': 'password123'
    }
    response = client.post('/api/auth/caregiver/login', json=login_payload)
    assert response.status_code == 200
    res = response.json()
    assert res['status'] == 'success'
    assert 'token' in res
    assert res['caregiver']['email'] == 'priya@neurosaathi.in'

    # Test Caregiver Registration
    reg_payload = {
        'name': 'Amina Khan',
        'email': 'amina@neurosaathi.in',
        'password': 'securepass123',
        'mobile': '9876500000'
    }
    reg_resp = client.post('/api/auth/caregiver/register', json=reg_payload)
    assert reg_resp.status_code == 200
    reg_res = reg_resp.json()
    assert reg_res['status'] == 'success'
    assert reg_res['caregiver']['name'] == 'Amina Khan'

def test_activity_submission():
    payload = {
        'patient_id': 'kamla',
        'activity_type': 'picture_recall',
        'difficulty': 'easy',
        'accuracy': 0.85,
        'response_time_seconds': 11.2,
        'attempts': 1,
        'mistakes': 1,
        'completion_status': 1,
        'items_shown': 4,
        'items_correct': 3
    }
    response = client.post('/api/activities/result', json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res['status'] == 'success'
    assert res['data']['accuracy'] == 0.85

def test_patient_activities_list():
    response = client.get('/api/patients/kamla/activities')
    assert response.status_code == 200
    data = response.json()
    assert 'activities' in data
    assert data['count'] > 0

def test_analytics_api():
    response = client.get('/api/patients/kamla/analytics')
    assert response.status_code == 200
    data = response.json()
    assert 'activity_performance' in data
    assert 'observations' in data
    assert 'disclaimer' in data
    assert 'not medical assessments' in data['disclaimer']

def test_recommendation_api():
    response = client.get('/api/patients/kamla/recommendation')
    assert response.status_code == 200
    data = response.json()
    assert 'recommended_activity' in data
    assert 'difficulty' in data
    assert 'reason' in data

def test_family_memories_api():
    # List memories
    response = client.get('/api/patients/kamla/family-memories')
    assert response.status_code == 200
    mems = response.json()
    assert len(mems) >= 1

    # Add new memory via JSON
    new_mem = {
        'name': 'Priya',
        'relationship': 'Cousin',
        'description': 'Lives in Delhi, visits annually',
        'photo_url': '👩'
    }
    add_resp = client.post('/api/patients/kamla/family-memories', json=new_mem)
    assert add_resp.status_code == 200
    added = add_resp.json()
    assert added['name'] == 'Priya'

def test_family_photo_upload_api():
    # Test Multipart Real Photo Upload
    fake_image_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    files = {
        'file': ('test_rahul.png', io.BytesIO(fake_image_bytes), 'image/png')
    }
    data = {
        'name': 'Rahul',
        'relationship': 'Son',
        'description': 'Rahul visits every Sunday'
    }
    
    upload_resp = client.post('/api/patients/kamla/family-memories/upload', data=data, files=files)
    assert upload_resp.status_code == 200
    res = upload_resp.json()
    assert res['name'] == 'Rahul'
    assert res['relationship'] == 'Son'
    assert res['photo_url'].startswith('/uploads/family/')

    # Verify static file serving
    img_resp = client.get(res['photo_url'])
    assert img_resp.status_code == 200

def test_alerts_api():
    response = client.get('/api/patients/kamla/alerts')
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1

def test_anomaly_detection_logic():
    history = [
        {'accuracy': 0.82, 'response_time_seconds': 12.0, 'difficulty': 'easy'},
        {'accuracy': 0.80, 'response_time_seconds': 11.5, 'difficulty': 'easy'},
        {'accuracy': 0.84, 'response_time_seconds': 12.5, 'difficulty': 'easy'},
        {'accuracy': 0.81, 'response_time_seconds': 11.8, 'difficulty': 'easy'},
    ]
    drop_result = {'accuracy': 0.50, 'response_time_seconds': 24.0, 'difficulty': 'easy'}
    
    eval_res = analyze_patient_anomaly(history, drop_result)
    assert eval_res['anomaly_detected'] is True
    assert 'noticeable change' in eval_res['message'].lower()
    assert 'not a medical diagnosis' in eval_res['disclaimer'].lower()
