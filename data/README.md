# NeuroSaathi Synthetic Dataset

## Disclaimer
> [!IMPORTANT]
> **This dataset contains purely synthetic demonstration data generated for machine learning research, software prototyping, and system testing purposes only.**
> It must **NOT** be used, interpreted, or relied upon as clinical, diagnostic, or real-world medical data.

## Overview
The file `synthetic_cognitive_activity.csv` contains 2,250 synthetic activity records generated using `generate_dataset.py` with a fixed random seed (`seed=42`).

### Dataset Fields
- `patient_id`: Synthetic anonymized patient identifier (1 to 50)
- `age_group`: Categorical age bucket ('60-64', '65-69', '70-74', '75-79', '80+')
- `activity_type`: Activity type (`picture_recall`, `family_memory`, `matching`)
- `difficulty`: Level of difficulty (`easy`, `medium`, `hard`)
- `accuracy`: Normalized accuracy score (0.0 to 1.0)
- `response_time_seconds`: Total completion time in seconds
- `attempts`: Total trial attempts taken during session
- `mistakes`: Count of incorrect actions/choices
- `completion_status`: Binary indicator (1 = completed, 0 = incomplete)
- `session_number`: Sequential session order for patient
- `memory_score`: Derived activity score for memory (0-100)
- `attention_score`: Derived activity score for attention (0-100)
- `recognition_score`: Derived activity score for recognition (0-100)
- `previous_accuracy`: Accuracy from prior session
- `performance_change`: Delta between current and prior session accuracy

## Generation Command
To regenerate the synthetic dataset:
```bash
python data/generate_dataset.py
```
