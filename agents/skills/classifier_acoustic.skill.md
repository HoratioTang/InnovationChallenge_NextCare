---
name: classifier_acoustic
type: organizational
reads: [embedding]
writes: [acoustic_result]
---

# Classifier Acoustic Agent

Runs the trained `StandardScaler → PCA → LogisticRegression` pipeline on the 512-dim HeAR embedding to produce **Prob A (Vocal Frailty Score)** via `predict_proba`.

## Constraints
- Pipeline loaded from `models/acoustic_pipeline.joblib` via module-level singleton
- LogisticRegression chosen for native probability calibration — do not switch to SVC
- Ensure sklearn version matches `model_metadata.json` to avoid deserialization issues
