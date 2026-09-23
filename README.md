<<<<<<< HEAD
# NeuroSaathi 🧠

**NeuroSaathi** is an AI-assisted cognitive engagement and memory assistance platform designed to make daily cognitive activities simpler and more accessible for elderly users while helping caregivers understand activity patterns over time.

---

### ⚠️ Healthcare Disclaimer
> **NeuroSaathi is an activity performance tool and cognitive engagement companion. It is NOT a medical clinical diagnostic system and does NOT replace professional medical advice.**

---

## 1. Project Overview & Solution

Elderly adults face challenges with complex digital interfaces when attempting daily memory practice. NeuroSaathi provides an elderly-friendly, low-friction interface with:
- **Simple Patient Home**: Clean actions with extra-large touch targets and speech synthesis.
- **Adaptive Activities**: Picture Recall, Family Memory Recognition, and Pattern Matching.
- **Caregiver Insights**: Performance trend analysis, activity history tracking, and AI-driven activity recommendations.
- **Privacy & Offline Support**: Local queuing for offline activity completion and automatic synchronization.

---

## 2. System Architecture

```text
React + Tailwind (Frontend)
       ↓
FastAPI (REST Backend)
       ↓
MongoDB Atlas (Data Store / In-Memory Seed Fallback)
       ↓
ML Service (Scikit-Learn)
       ↓
Personalization & Recommendation Engine
       ↓
Caregiver Dashboard
```

---

## 3. Tech Stack

- **Frontend**: React 18, Vite, Recharts, Web Speech API (TTS)
- **Backend**: FastAPI, Python 3.14, Pydantic
- **Database**: MongoDB Atlas (PyMongo) with fallback to in-memory store
- **Machine Learning**: `scikit-learn` (RandomForestRegressor, IsolationForest), `pandas`, `joblib`
- **Testing**: `pytest`, `fastapi.testclient`

---

## 4. Synthetic Dataset & ML Models

### Synthetic Dataset
- Generated using `data/generate_dataset.py` with reproducible random seeds (`seed=42`).
- Contains **2,250 synthetic records** across 50 patient trajectory profiles.
- *Explicit label: Demonstration data — not clinical data.*

### ML Models
1. **Performance Prediction Model**: `RandomForestRegressor` (150 trees, max_depth=10).
   - MAE: **0.0180**
   - RMSE: **0.0222**
   - R²: **0.9657**
2. **Anomaly Detection Model**: `IsolationForest` (n_estimators=100, contamination=0.08) evaluating performance drops against personal baseline (minimum 3 history sessions).
3. **Adaptive Recommendation Engine**: Rule + ML prediction hybrid balancing cognitive variety and difficulty.

---

## 5. Setup & Running Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+

### 2. Backend Setup & Virtual Environment

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Activate (Linux / macOS)
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Generate Synthetic Dataset & Train ML Models

```bash
# Generate 2,250 synthetic session records
python data/generate_dataset.py

# Train RandomForest & IsolationForest models
python ml/train_model.py
```

### 4. Run Backend Server

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```
Backend API will be accessible at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### 5. Frontend Setup & Launch

```bash
cd frontend
npm install
npm run dev
```
Frontend will be accessible at `http://localhost:5173`.

---

## 6. Demo Mode & Demo Journey

The application launches with **Pre-seeded Demo Patient: Kamla Devi (72 yrs)** containing 32 historical activity sessions.

### Complete Demo Journey:
1. **Caregiver Dashboard**: Open app -> View Kamla Devi's trend charts, completion status, and observations.
2. **Patient Mode**: Switch to Patient Mode -> View simple home screen ("Good Morning, Kamla ❤️").
3. **AI Guidance**: AI suggests next activity (Picture Recall / Family Memory / Matching).
4. **Interactive Play**: Patient completes game -> Encouraging feedback without stressful timers.
5. **Result Stored**: Result submitted to FastAPI & saved to database (or queued locally if offline).
6. **ML Analysis**: Isolation Forest checks personal baseline; recommendation engine updates.
7. **Caregiver Insight**: Switch to Caregiver View -> Updated charts, session count, and observations.
8. **Developer ML Page**: Switch to `Developer ML Page` tab to view R², MAE, RMSE, and Isolation Forest status.

---

## 7. Environment Variables (`.env.example`)

```env
APP_NAME=NeuroSaathi
APP_ENV=development
API_HOST=0.0.0.0
API_PORT=8000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/neurosaathi
DEMO_MODE=true
```

---

## 8. Running Automated Tests

```bash
python -m pytest backend/tests
```

---

## 9. Future Scope

The following features are planned for future iterations:
- Additional cognitive activities (Music Memory, Daily-life Sequencing)
- Expanded NER language support (Assamese, Bengali)
- Enhanced voice interaction
- Clinician reporting module
- Cloud push notifications for caregivers
=======
# NeuroSaathi
>>>>>>> 146a4c6944095dd2a6b764e6e2c33d175437e197
