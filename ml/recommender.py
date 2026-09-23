from pathlib import Path
from typing import List, Dict, Any
import joblib
import pandas as pd
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATHS = [
    ROOT / 'backend' / 'ml' / 'models' / 'performance_model.joblib',
    ROOT / 'ml' / 'models' / 'performance_model.joblib',
]

def load_performance_model():
    for p in MODEL_PATHS:
        if p.exists():
            try:
                return joblib.load(p)
            except Exception:
                pass
    return None

def recommend_next_activity(patient_history: List[Dict[str, Any]], age_group: str = '70-74') -> Dict[str, Any]:
    """
    Hybrid recommendation engine combining historical accuracy, ML performance prediction,
    cooldown/balancing mechanisms, and transparent rules.
    """
    activities = ['picture_recall', 'family_memory', 'matching']
    
    if not patient_history:
        return {
            'recommended_activity': 'picture_recall',
            'difficulty': 'easy',
            'reason': 'Start with a familiar, low-pressure memory game to build confidence.',
            'target_percentages': {'picture_recall': '40%', 'family_memory': '25%', 'matching': '35%'}
        }

    last_3 = [item.get('activity_type') for item in patient_history[-3:]]
    most_recent = last_3[-1] if last_3 else None
    
    df = pd.DataFrame(patient_history)
    
    avg_accuracy = float(df['accuracy'].mean())
    recent_5 = df.tail(5)
    recent_avg = float(recent_5['accuracy'].mean())
    
    last_3_accs = df.tail(3)['accuracy'].tolist()
    consistent_high = len(last_3_accs) >= 3 and all(acc >= 0.82 for acc in last_3_accs)
    consistent_low = len(last_3_accs) >= 2 and all(acc < 0.55 for acc in last_3_accs)

    last_difficulty = df.iloc[-1].get('difficulty', 'easy')
    
    if consistent_high:
        if last_difficulty == 'easy':
            next_difficulty = 'medium'
        elif last_difficulty == 'medium':
            next_difficulty = 'hard'
        else:
            next_difficulty = 'hard'
    elif consistent_low:
        if last_difficulty == 'hard':
            next_difficulty = 'medium'
        else:
            next_difficulty = 'easy'
    else:
        next_difficulty = last_difficulty

    pic_df = df[df['activity_type'] == 'picture_recall']
    pic_avg = pic_df['accuracy'].mean() if not pic_df.empty else 0.7
    
    fam_df = df[df['activity_type'] == 'family_memory']
    fam_avg = fam_df['accuracy'].mean() if not fam_df.empty else 0.7

    match_df = df[df['activity_type'] == 'matching']
    match_avg = match_df['accuracy'].mean() if not match_df.empty else 0.7

    if pic_avg < 0.55 and most_recent != 'picture_recall':
        rec_act = 'picture_recall'
        reason = 'Recent recall performance indicates a simpler picture recall session will provide warm practice.'
        next_difficulty = 'easy'
    elif fam_avg < 0.60 and most_recent != 'family_memory':
        rec_act = 'family_memory'
        reason = 'A gentle family recognition activity is recommended to support personal connection and memory confidence.'
    elif last_3.count(most_recent) >= 2:
        candidates = [a for a in activities if a != most_recent]
        rec_act = candidates[0]
        reason = f'To maintain cognitive variety and balance, switching from {most_recent.replace("_", " ")} to {rec_act.replace("_", " ")}.'
    else:
        counts = {a: (df['activity_type'] == a).sum() for a in activities}
        total = len(df)
        ratio_pic = counts['picture_recall'] / total
        ratio_fam = counts['family_memory'] / total
        
        if ratio_pic < 0.35 and most_recent != 'picture_recall':
            rec_act = 'picture_recall'
            reason = 'Picture recall reinforces visual memory and is scheduled for balanced practice.'
        elif ratio_fam < 0.20 and most_recent != 'family_memory':
            rec_act = 'family_memory'
            reason = 'Family memory practice reinforces personal recognition and social recall.'
        else:
            rec_act = 'matching'
            reason = 'Matching game offers interactive pattern-recognition and attention practice.'

    ml_model = load_performance_model()
    predicted_acc = None
    if ml_model is not None:
        try:
            feat_df = pd.DataFrame([{
                'age_group': 3,
                'activity_type': {'picture_recall': 1, 'family_memory': 2, 'matching': 3}[rec_act],
                'difficulty': {'easy': 1, 'medium': 2, 'hard': 3}[next_difficulty],
                'previous_accuracy': df.iloc[-1]['accuracy'],
                'response_time_seconds': df.iloc[-1]['response_time_seconds'],
                'attempts': df.iloc[-1]['attempts'],
                'mistakes': df.iloc[-1]['mistakes'],
                'memory_score': df.iloc[-1].get('memory_score', 75.0),
                'attention_score': df.iloc[-1].get('attention_score', 75.0),
                'recognition_score': df.iloc[-1].get('recognition_score', 75.0),
            }])
            predicted_acc = float(ml_model.predict(feat_df)[0])
        except Exception:
            predicted_acc = None

    return {
        'recommended_activity': rec_act,
        'difficulty': next_difficulty,
        'reason': reason,
        'ml_predicted_accuracy': round(predicted_acc, 4) if predicted_acc is not None else None,
        'target_percentages': {'picture_recall': '40%', 'family_memory': '25%', 'matching': '35%'},
        'disclaimer': 'This recommendation is an activity-performance guidance tool, not a medical diagnosis.'
    }
