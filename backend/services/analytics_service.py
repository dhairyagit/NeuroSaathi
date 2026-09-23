from datetime import datetime, timedelta
from typing import Dict, Any, List
import pandas as pd
import numpy as np

from backend.services.activity_service import get_patient_activities
from ml.anomaly_detector import analyze_patient_anomaly

def get_patient_analytics(patient_id: str) -> Dict[str, Any]:
    records = get_patient_activities(patient_id)
    if not records:
        return {
            'activity_count': 0,
            'today_activities_count': 0,
            'today_activities': [],
            'average_accuracy': 0.0,
            'activity_performance': {
                'memory_activities': 0.0,
                'recognition_activities': 0.0,
                'attention_activities': 0.0,
            },
            'recent_performance_trend': [],
            'observations': [
                {
                    'text': 'No activity history recorded yet for this patient.',
                    'status': 'neutral',
                    'why': 'There is not enough activity history to compute performance trends.',
                    'data_used': ['recent accuracy', 'response time', 'activity history']
                }
            ],
            'disclaimer': 'These values summarize performance in NeuroSaathi activities and are not medical assessments.'
        }

    df = pd.DataFrame(records)
    
    # 1. Total & Today's Activity Summary
    today_str = datetime.now().strftime('%Y-%m-%d')
    df['date_str'] = df['timestamp'].apply(lambda x: str(x)[:10])
    today_df = df[df['date_str'] == today_str]
    
    today_activities = []
    if not today_df.empty:
        for act in ['picture_recall', 'family_memory', 'matching']:
            sub = today_df[today_df['activity_type'] == act]
            if not sub.empty:
                acc = float(sub['accuracy'].mean())
                today_activities.append({
                    'activity_type': act,
                    'display_name': act.replace('_', ' ').title(),
                    'accuracy': round(acc, 4),
                    'percentage': int(round(acc * 100))
                })
    
    # If no activities today, calculate recent session activity breakdown
    if not today_activities:
        recent_3 = df.tail(3)
        for _, row in recent_3.iterrows():
            act = row['activity_type']
            acc = float(row['accuracy'])
            today_activities.append({
                'activity_type': act,
                'display_name': act.replace('_', ' ').title(),
                'accuracy': round(acc, 4),
                'percentage': int(round(acc * 100))
            })

    # 2. Domain "Activity Performance" (Memory, Recognition, Attention)
    mem_df = df[df['activity_type'] == 'picture_recall']
    rec_df = df[df['activity_type'] == 'family_memory']
    att_df = df[df['activity_type'] == 'matching']
    
    mem_perf = float(mem_df['accuracy'].mean()) if not mem_df.empty else float(df['accuracy'].mean())
    rec_perf = float(rec_df['accuracy'].mean()) if not rec_df.empty else float(df['accuracy'].mean())
    att_perf = float(att_df['accuracy'].mean()) if not att_df.empty else float(df['accuracy'].mean())
    
    overall_avg = float(df['accuracy'].mean())

    # 3. Chart Trends Data for Recharts
    # Daily aggregation over past sessions
    trend_data = []
    # Group by date or session index
    tail_records = df.tail(15)
    for idx, row in tail_records.iterrows():
        trend_data.append({
            'session': f"S{int(row['session_number'])}",
            'date': str(row['timestamp'])[:10],
            'accuracy': int(round(float(row['accuracy']) * 100)),
            'response_time': float(row['response_time_seconds']),
            'memory_score': int(round(float(row.get('memory_score', row['accuracy'] * 100)))),
            'activity': row['activity_type'].replace('_', ' ').title()
        })

    # 4. Dynamic Observations Generation
    observations = []
    recent_5 = df.tail(5)
    recent_avg = float(recent_5['accuracy'].mean())
    prev_baseline = float(df.iloc[:-5]['accuracy'].mean()) if len(df) > 5 else overall_avg

    # Observation 1: Overall Trend Observation
    if recent_avg >= prev_baseline + 0.05:
        observations.append({
            'text': '✓ Activity performance has improved over recent sessions.',
            'status': 'positive',
            'why': 'This observation is based on the patient\'s recent activity results compared with their previous activity performance.',
            'data_used': ['recent accuracy', 'response time', 'activity history']
        })
    elif recent_avg <= prev_baseline - 0.12:
        observations.append({
            'text': '⚠ Recent picture recall / activity performance is lower than the patient\'s recent baseline.',
            'status': 'warning',
            'why': 'This observation is based on comparing recent session scores against the patient\'s historical personal baseline.',
            'data_used': ['recent accuracy', 'response time', 'activity history']
        })
    else:
        observations.append({
            'text': '✓ Matching and recall performance has remained steady and consistent.',
            'status': 'positive',
            'why': 'Recent activity accuracy stays within 5% of the patient\'s average baseline.',
            'data_used': ['recent accuracy', 'response time', 'activity history']
        })

    # Observation 2: Family Memory / Recognition Specific
    if not rec_df.empty:
        rec_recent = float(rec_df.tail(3)['accuracy'].mean())
        if rec_recent >= 0.80:
            observations.append({
                'text': '✓ Family recognition performance shows strong engagement and familiar association.',
                'status': 'positive',
                'why': 'Family recognition accuracy averaged high over recent recognition tasks.',
                'data_used': ['family memory accuracy', 'completion status']
            })

    baseline_comparison = {
        'overall_average_accuracy': overall_avg,
        'total_sessions': len(records),
        'recent_average_accuracy': recent_avg if 'recent_avg' in locals() else overall_avg,
    }

    return {
        'activity_count': len(records),
        'today_activities_count': len(today_df) if not today_df.empty else len(today_activities),
        'today_activities': today_activities,
        'average_accuracy': round(overall_avg, 4),
        'average_accuracy_percentage': int(round(overall_avg * 100)),
        'activity_performance': {
            'memory_activities': int(round(mem_perf * 100)),
            'recognition_activities': int(round(rec_perf * 100)),
            'attention_activities': int(round(att_perf * 100)),
        },
        'recent_performance_trend': trend_data,
        'accuracy_trend': trend_data,
        'baseline_comparison': baseline_comparison,
        'observations': observations,
        'disclaimer': 'These values summarize performance in NeuroSaathi activities and are not medical assessments.'
    }
