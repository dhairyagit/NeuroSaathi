from fastapi import APIRouter

router = APIRouter(prefix='/caregiver', tags=['caregiver'])


@router.get('/dashboard')
def caregiver_dashboard():
    return {
        'patient_count': 2,
        'activities_completed': 12,
        'recent_observations': [
            'Recent memory-game performance is noticeably different from the patient\'s recent baseline.',
            'Recommended activity: picture recall with simple prompts.'
        ],
        'disclaimer': 'NeuroSaathi is a cognitive engagement and memory assistance tool. It is not a medical diagnostic system and does not replace professional medical advice.'
    }
