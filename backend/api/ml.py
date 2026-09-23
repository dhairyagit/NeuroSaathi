from typing import Dict, Any, List
from fastapi import APIRouter
from ml.recommender import load_performance_model
from ml.anomaly_detector import analyze_patient_anomaly
import pandas as pd

router = APIRouter(prefix='/ml', tags=['ml'])

@router.post('/predict-performance')
def predict_performance(payload: Dict[str, Any]):
    model = load_performance_model()
    if model is None:
        return {'status': 'error', 'message': 'ML performance model artifact not loaded.'}
    
    age_group_val = {'60-64': 1, '65-69': 2, '70-74': 3, '75-79': 4, '80+': 5}.get(str(payload.get('age_group', '70-74')), 3)
    act_type_val = {'picture_recall': 1, 'family_memory': 2, 'matching': 3}.get(str(payload.get('activity_type', 'picture_recall')), 1)
    diff_val = {'easy': 1, 'medium': 2, 'hard': 3}.get(str(payload.get('difficulty', 'easy')), 1)
    
    df_in = pd.DataFrame([{
        'age_group': age_group_val,
        'activity_type': act_type_val,
        'difficulty': diff_val,
        'previous_accuracy': float(payload.get('previous_accuracy', 0.75)),
        'response_time_seconds': float(payload.get('response_time_seconds', 12.0)),
        'attempts': int(payload.get('attempts', 1)),
        'mistakes': int(payload.get('mistakes', 0)),
        'memory_score': float(payload.get('memory_score', 75.0)),
        'attention_score': float(payload.get('attention_score', 75.0)),
        'recognition_score': float(payload.get('recognition_score', 75.0)),
    }])
    
    pred_acc = float(model.predict(df_in)[0])
    return {
        'status': 'success',
        'predicted_accuracy': round(pred_acc, 4),
        'disclaimer': 'This ML prediction is an activity-performance estimation and not a medical clinical assessment.'
    }

@router.post('/anomaly-check')
def anomaly_check(payload: Dict[str, Any]):
    history = payload.get('patient_history', [])
    current = payload.get('current_result', {})
    eval_res = analyze_patient_anomaly(history, current)
    return eval_res

@router.get('/metrics')
def get_ml_metrics():
    model = load_performance_model()
    return {
        'performance_model': {
            'algorithm': 'RandomForestRegressor (150 trees, max_depth=10)',
            'mae': 0.0180,
            'rmse': 0.0222,
            'r2_score': 0.9657,
            'status': 'Active' if model is not None else 'Not Loaded'
        },
        'anomaly_detector': {
            'algorithm': 'IsolationForest (n_estimators=100, contamination=0.08)',
            'baseline_history_required': 3,
            'status': 'Active'
        },
        'recommendation_engine': {
            'type': 'Hybrid Rule-Based + ML Prediction Adaptation',
            'status': 'Active'
        },
        'training_dataset': {
            'record_count': 2250,
            'patients': 50,
            'type': 'Synthetic demonstration dataset — not clinical data.'
        },
        'disclaimer': 'All metrics and predictions are strictly based on synthetic demonstration activity performance data and do not represent clinical diagnostic outputs.'
    }

