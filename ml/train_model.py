import os
from pathlib import Path
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data' / 'synthetic_cognitive_activity.csv'
MODEL_DIR_1 = ROOT / 'ml' / 'models'
MODEL_DIR_2 = ROOT / 'backend' / 'ml' / 'models'

MODEL_DIR_1.mkdir(parents=True, exist_ok=True)
MODEL_DIR_2.mkdir(parents=True, exist_ok=True)

AGE_MAP = {'60-64': 1, '65-69': 2, '70-74': 3, '75-79': 4, '80+': 5}
ACTIVITY_MAP = {'picture_recall': 1, 'family_memory': 2, 'matching': 3}
DIFFICULTY_MAP = {'easy': 1, 'medium': 2, 'hard': 3}

FEATURE_COLS = [
    'age_group',
    'activity_type',
    'difficulty',
    'previous_accuracy',
    'response_time_seconds',
    'attempts',
    'mistakes',
    'memory_score',
    'attention_score',
    'recognition_score'
]

def prepare_data(csv_path: Path):
    df = pd.read_csv(csv_path)
    df_encoded = df.copy()
    
    df_encoded['age_group'] = df_encoded['age_group'].map(AGE_MAP).fillna(3)
    df_encoded['activity_type'] = df_encoded['activity_type'].map(ACTIVITY_MAP).fillna(1)
    df_encoded['difficulty'] = df_encoded['difficulty'].map(DIFFICULTY_MAP).fillna(1)
    
    return df_encoded

def train_and_save():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}. Run python data/generate_dataset.py first.")
        
    df = prepare_data(DATA_PATH)
    
    X = df[FEATURE_COLS]
    y = df['accuracy']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    regressor = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42)
    regressor.fit(X_train, y_train)
    
    y_pred = regressor.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = root_mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print("=== Model Performance Metrics ===")
    print(f"MAE  : {mae:.4f}")
    print(f"RMSE : {rmse:.4f}")
    print(f"R²   : {r2:.4f}")
    print("=================================")
    
    # Save regressor
    for d in [MODEL_DIR_1, MODEL_DIR_2]:
        joblib.dump(regressor, d / 'performance_model.joblib')
    print(f"RandomForest model saved successfully to {MODEL_DIR_1} and {MODEL_DIR_2}")
    
    # Train IsolationForest Anomaly Detector on normalized baseline features
    anomaly_features = ['accuracy', 'response_time_seconds', 'attempts', 'mistakes', 'difficulty']
    anom_df = df[anomaly_features].copy()
    anom_df['difficulty'] = anom_df['difficulty'].map(DIFFICULTY_MAP).fillna(1)
    
    iso_forest = IsolationForest(n_estimators=100, contamination=0.08, random_state=42)
    iso_forest.fit(anom_df)
    
    for d in [MODEL_DIR_1, MODEL_DIR_2]:
        joblib.dump(iso_forest, d / 'anomaly_detector.joblib')
    print(f"IsolationForest model saved successfully to {MODEL_DIR_1} and {MODEL_DIR_2}")
    print("Note: All ML models are based on synthetic demonstration data and are not medical clinical diagnostic tools.")

if __name__ == '__main__':
    train_and_save()
