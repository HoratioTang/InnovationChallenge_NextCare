---
name: classifier_semantic
type: organizational
reads: [linguistic_features]
writes: [semantic_result]
---

# Classifier Semantic Agent

Runs the trained `StandardScaler → LogisticRegression(class_weight='balanced')` pipeline on a subset of linguistic features to produce **Prob B (Cognitive Footprint Score)** via `predict_proba`.

Unlike the acoustic pipeline, there is no PCA step — the model operates on 6 selected features directly: `mattr`, `ttr_raw`, `pronoun_to_noun_ratio`, `topic_drift`, `semantic_coherence_std`, `discourse_filler_rate`.

## Inference Flow

1. Load `feature_names` from `models/semantic_metadata.json` to get the canonical column order
2. Extract the selected features from `state.linguistic_features` dict in that order
3. Handle `inf` values (e.g. `pronoun_to_noun_ratio` when noun count is 0) by replacing with 0.0
4. Pass the 1×6 array through `pipeline.predict_proba()` → column index 1 is P(dementia)

## Constraints
- Pipeline loaded from `models/semantic_pipeline.joblib` via module-level singleton
- Feature ordering must match training — always read order from `semantic_metadata.json`, never hardcode
- LogisticRegression chosen for native probability calibration — do not switch to SVC
- Ensure sklearn version matches `semantic_metadata.json` to avoid deserialization issues
- Must handle `inf` in features (training replaced inf with column median; at inference, replace with 0.0 as safe default)
