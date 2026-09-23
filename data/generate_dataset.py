import os
import random
from pathlib import Path
import pandas as pd
import numpy as np

# Set reproducible random seeds
random.seed(42)
np.random.seed(42)

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = ROOT / 'data' / 'synthetic_cognitive_activity.csv'

activity_types = ['picture_recall', 'family_memory', 'matching']
age_groups = ['60-64', '65-69', '70-74', '75-79', '80+']

# Assign patient trajectory profiles:
# 0: Gradual Improvement
# 1: Stable
# 2: Fluctuating
# 3: Occasional drop
# 4: Noticeable performance change
patient_profiles = {}
for p_id in range(1, 51):
    patient_profiles[p_id] = {
        'age_group': random.choice(age_groups),
        'pattern': p_id % 5,
        'base_ability': random.uniform(0.65, 0.88),
    }

records = []
total_sessions_per_patient = 45  # 50 * 45 = 2,250 records

for patient_id in range(1, 51):
    profile = patient_profiles[patient_id]
    age_group = profile['age_group']
    pattern = profile['pattern']
    base_ability = profile['base_ability']
    
    prev_acc = base_ability
    
    for session_number in range(1, total_sessions_per_patient + 1):
        activity_type = random.choice(activity_types)
        difficulty = random.choice(['easy', 'medium', 'hard'])
        
        # Calculate trend modifier based on trajectory pattern
        if pattern == 0:  # Gradual Improvement
            trend = (session_number / total_sessions_per_patient) * 0.15
        elif pattern == 1:  # Stable
            trend = 0.0
        elif pattern == 2:  # Fluctuating
            trend = np.sin(session_number / 3.0) * 0.10
        elif pattern == 3:  # Occasional poor performance
            trend = -0.30 if (session_number in [12, 27, 38]) else 0.0
        elif pattern == 4:  # Noticeable performance drop in recent sessions
            trend = -0.25 if session_number > 35 else 0.05
        else:
            trend = 0.0

        diff_penalty = {'easy': 0.05, 'medium': 0.0, 'hard': -0.10}[difficulty]
        
        raw_accuracy = base_ability + trend + diff_penalty + random.uniform(-0.08, 0.08)
        accuracy = round(max(0.20, min(0.98, raw_accuracy)), 4)
        
        response_time_seconds = round({
            'easy': random.uniform(6.0, 14.0),
            'medium': random.uniform(10.0, 22.0),
            'hard': random.uniform(15.0, 32.0),
        }[difficulty] * (1.2 if accuracy < 0.6 else 1.0), 2)
        
        attempts = {
            'easy': random.randint(1, 2),
            'medium': random.randint(1, 3),
            'hard': random.randint(2, 4),
        }[difficulty]
        
        mistakes = max(0, int(round((1.0 - accuracy) * attempts * 2.2)))
        completion_status = 1 if accuracy >= 0.45 or random.random() < 0.85 else 0
        
        memory_score = round(max(0, min(100, accuracy * 95 + random.uniform(-5, 8))), 2)
        attention_score = round(max(0, min(100, (1.0 - min(1.0, response_time_seconds / 40.0)) * 50 + accuracy * 50)), 2)
        recognition_score = round(max(0, min(100, (accuracy * 85) + random.uniform(5, 15))), 2)
        
        previous_accuracy = round(prev_acc, 4)
        performance_change = round(accuracy - previous_accuracy, 4)
        prev_acc = accuracy
        
        records.append({
            'patient_id': patient_id,
            'age_group': age_group,
            'activity_type': activity_type,
            'difficulty': difficulty,
            'accuracy': accuracy,
            'response_time_seconds': response_time_seconds,
            'attempts': attempts,
            'mistakes': mistakes,
            'completion_status': completion_status,
            'session_number': session_number,
            'memory_score': memory_score,
            'attention_score': attention_score,
            'recognition_score': recognition_score,
            'previous_accuracy': previous_accuracy,
            'performance_change': performance_change,
        })

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
df = pd.DataFrame(records)
df.to_csv(OUTPUT_PATH, index=False)
print(f"Synthetic dataset generated successfully: {len(df)} rows saved to {OUTPUT_PATH}")
print("Note: This synthetic demonstration dataset must not be interpreted as clinical data.")
