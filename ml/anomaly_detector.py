from pathlib import Path
from typing import List, Dict, Any, Optional
import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATHS = [
    ROOT / 'backend' / 'ml' / 'models' / 'anomaly_detector.joblib',
    ROOT / 'ml' / 'models' / 'anomaly_detector.joblib',
]

DIFFICULTY_MAP = {'easy': 1, 'medium': 2, 'hard': 3}

def load_anomaly_model():
    for p in MODEL_PATHS:
        if p.exists():
            try:
                return joblib.load(p)
            except Exception:
                pass
    return None

def analyze_patient_anomaly(patient_history: List[Dict[str, Any]], current_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates current result against patient's personal baseline.
    Requires minimum 3 prior sessions for personal baseline comparison.
    """
    min_sessions_required = 3
    if len(patient_history) < min_sessions_required:
        return {
            'anomaly_detected': False,
            'reason': f"Insufficient activity history ({len(patient_history)}/{min_sessions_required} sessions). Building initial baseline.",
            'confidence': 0.0,
            'is_activity_performance_observation': True
        }

    # Extract historical accuracy for this patient
    past_accuracies = [float(item.get('accuracy', 0.5)) for item in patient_history]
    baseline_avg = float(np.mean(past_accuracies))
    baseline_std = float(np.std(past_accuracies)) if len(past_accuracies) > 1 else 0.05
    
    current_acc = float(current_result.get('accuracy', 0.0))
    current_resp_time = float(current_result.get('response_time_seconds', 15.0))
    current_attempts = int(current_result.get('attempts', 1))
    current_mistakes = int(current_result.get('mistakes', 0))
    current_diff = str(current_result.get('difficulty', 'easy')).lower()
    
    # 1. Individual Baseline Statistical Check (Z-score drop check)
    std_thresh = max(0.08, baseline_std * 1.5)
    personal_drop = (baseline_avg - current_acc) > std_thresh and current_acc < (baseline_avg - 0.15)
    
    # 2. IsolationForest Check
    iso_model = load_anomaly_model()
    iso_anomaly = False
    if iso_model is not None:
        try:
            df_in = pd.DataFrame([{
                'accuracy': current_acc,
                'response_time_seconds': current_resp_time,
                'attempts': current_attempts,
                'mistakes': current_mistakes,
                'difficulty': DIFFICULTY_MAP.get(current_diff, 1)
            }])
            pred = iso_model.predict(df_in)[0]
            if pred == -1:
                iso_anomaly = True
        except Exception:
            pass

    # Anomaly is confirmed if personal baseline drop occurs, or if severe ML outlier occurs alongside drop
    anomaly_detected = personal_drop or (iso_anomaly and (baseline_avg - current_acc > 0.12))

    if anomaly_detected:
        message = (
            f"A noticeable change in recent activity performance was detected. "
            f"Recent result ({int(current_acc * 100)}%) differs from personal baseline ({int(baseline_avg * 100)}%)."
        )
    else:
        message = "Activity performance is within the expected range for the patient's personal baseline."

    return {
        'anomaly_detected': anomaly_detected,
        'current_accuracy': round(current_acc, 4),
        'baseline_accuracy': round(baseline_avg, 4),
        'difference': round(current_acc - baseline_avg, 4),
        'message': message,
        'disclaimer': "This is an activity-performance observation, not a medical diagnosis.",
        'is_activity_performance_observation': True
    }
