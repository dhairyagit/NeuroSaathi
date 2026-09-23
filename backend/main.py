from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.api.activities import router as activities_router
from backend.api.alerts import router as alerts_router
from backend.api.analytics import router as analytics_router
from backend.api.auth import router as auth_router
from backend.api.caregiver import router as caregiver_router
from backend.api.family_memories import router as family_memories_router
from backend.api.ml import router as ml_router
from backend.api.patients import router as patients_router
from backend.api.recommendations import router as recommendations_router

app = FastAPI(
    title='NeuroSaathi API',
    description='NeuroSaathi Phase 2 API supporting cognitive activities, caregiver authentication, real family photo storage, regional localization, ML analytics, caregiver dashboard, and dynamic alerts.',
    version='2.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Ensure uploads directory exists and mount static route
UPLOADS_DIR = Path(__file__).resolve().parent / 'uploads'
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount('/uploads', StaticFiles(directory=UPLOADS_DIR), name='uploads')

app.include_router(auth_router, prefix='/api')
app.include_router(patients_router, prefix='/api')
app.include_router(activities_router, prefix='/api')
app.include_router(family_memories_router, prefix='/api')
app.include_router(alerts_router, prefix='/api')
app.include_router(caregiver_router, prefix='/api')
app.include_router(analytics_router, prefix='/api')
app.include_router(recommendations_router, prefix='/api')
app.include_router(ml_router, prefix='/api')

@app.get('/api/health')
def health_check():
    return {
        'status': 'ok',
        'app': 'NeuroSaathi API',
        'version': '2.0.0',
        'disclaimer': 'NeuroSaathi is an activity performance tool and not a medical clinical diagnostic system.'
    }
