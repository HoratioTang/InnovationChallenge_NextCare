# Dementia Screening System

## What This Is
A non-invasive, home-based dementia screening tool for the NUS MSBA DBA5102 Innovation Challenge. Analyzes 7-day conversational audio recordings using a **parallel multimodal fusion** architecture: one branch analyzes *how* a person sounds (acoustic), the other analyzes *what* they say (semantic). Results are fused and an LLM generates a caregiver-facing report.

Target context: Singapore — supports English, Mandarin, Malay, and Singlish.

---

## Current State (What Exists Now)

### Environment
Notebooks currently run on **Google Colab** with GPU (CUDA).
- Mount Google Drive at `/content/drive/MyDrive/NUS_MSBA/DBA5102/Innovation_Challenge/`
- Hugging Face token stored as Colab secret `HF_TOKEN` (required — `google/hear-pytorch` is gated)

```bash
pip install transformers librosa torch pandas huggingface_hub
```

### Data
```
data/
  dementia/       # label=1
    <Subject Name>/<n>_<years_before_diagnosis>.wav
  nodementia/     # label=0
    <Subject Name>/<n>_<clip_number>.wav
```
455 total samples: 131 dementia, 324 no-dementia (imbalanced).

### What's Built
- **`HeAR.ipynb`** — The working acoustic pipeline. Contains three stages being refactored into separate agent modules. See [Refactoring Map](#refactoring-map-hearipynb--target-modules) below for cell-to-file mapping.
- **`semantic_stream.ipynb`** — Empty, work in progress.

### HeAR Model Details (`google/hear-pytorch`)
- ViT-Large: 24 layers, 1024 hidden dim, pooler projects to 512-dim
- Load with `trust_remote_code=True`
- Audio: 16kHz mono, strict 2s chunks (shorter tail chunks discarded)
- Embeddings from `pooler_output` (512-dim), averaged across all chunks per file

### HeAR Preprocessing — Version History
**Version 1 (DEPRECATED, commented out in notebook):**
Manual mel-spectrogram computation — 128 mel bins, hop_length=160, dB scale, transpose from `(128, 192)` to `(192, 128)`, input shape `(1, 1, 192, 128)`. Do NOT use this.

**Version 2 (CURRENT):**
Uses the official Google HeAR preprocessing. Clones `https://github.com/google-health/hear.git` and imports `preprocess_audio` from `hear.python.data_processing.audio_utils`. The function handles all spectrogram conversion internally — no manual mel-spectrogram code needed. The flow is:
1. Raw chunk as numpy array → `np.expand_dims(chunk, axis=0)` → `torch.Tensor`
2. Pass through `preprocess_audio()` → returns model-ready 4D tensor
3. `model.forward(processed_tensor, return_dict=True, output_hidden_states=True)`
4. Extract `pooler_output` (512-dim)

### Current Classifier (LogisticRegression)
Using `LogisticRegression(class_weight='balanced')` with group-aware data splitting to prevent subject-level leakage.
- Hold-out split: `GroupShuffleSplit` (ensures no subject appears in both train and test)
- CV: `StratifiedGroupKFold(n_splits=5)` (prevents leakage during cross-validation too)
- Pipeline: `StandardScaler → PCA → LogisticRegression(class_weight='balanced')`
- Grid search: `pca__n_components` ∈ {10, 20, 30, 50, 0.95}, `clf__C` ∈ {0.001, 0.01, 0.1, 1, 10}
- LogReg produces native, well-calibrated probabilities — no Platt scaling needed. This matters because Prob A feeds directly into weighted fusion.

**Why LogReg over SVC:** SVC with `probability=True` uses Platt scaling which can produce probabilities inconsistent with predictions (e.g., predicted=1 but P(dementia)=0.36). LogReg and SVC achieve near-identical performance on this dataset (~0.47 F1, ~0.71 AUC-ROC), so we pick the model with natively consistent probabilities.

**Note:** The notebook also contains a LinearSVC variant (Cell 20, no group splitting) and an SVC variant (Cell 21). These are superseded; LogisticRegression (Cell 22) is the one moving forward.

---

## Target Architecture (What We're Building Toward)

### Project Structure
```
dementia-screening/
├── app/                        # Streamlit frontend (audio upload, report display)
├── agents/                     # LangGraph agent nodes (one function per file)
│   ├── state.py                # Shared AgentState TypedDict — the contract for all nodes
│   ├── skills/                 # Skill definition files (.skill.md per agent)
│   ├── graph.py                # Main LangGraph graph wiring all agents
│   ├── audio_process.py        # ← from HeAR.ipynb Cell 6: load_and_chunk_audio()
│   ├── hear_embed.py           # ← from HeAR.ipynb Cell 14: extract_hear_embeddings() (Version 2)
│   ├── classifier_acoustic.py  # ← from HeAR.ipynb Cell 22: LogReg predict_proba at inference
│   ├── transcription.py        # MERaLiON-AudioLLM (LLM-driven, ASR + Singlish)
│   ├── feature_calc.py         # Linguistic feature extraction (cognitive footprints)
│   ├── classifier_semantic.py  # Classifier Model 2 (on linguistic features)
│   ├── fusion.py               # Weighted decision fusion (Prob = w1*A + w2*B)
│   └── report.py               # Report agent (LLM-driven, Gemini 1.5 Pro)
├── training/                   # Offline scripts — run once on Colab, produce artifacts
│   └── train_acoustic.py       # GridSearchCV + model saving (from HeAR.ipynb Cells 2, 15, 22)
├── models/                     # Trained model artifacts (gitignored, produced by training/)
│   ├── hear_model_local/       # HeAR weights saved via model.save_pretrained()
│   ├── acoustic_pipeline.joblib # Fitted StandardScaler → PCA → LogReg pipeline
│   └── model_metadata.json     # Best params, versions, metrics for reproducibility
├── utils/                      # Shared utilities
│   └── config.py               # All constants, paths, thresholds (single source of truth)
├── tests/
├── requirements.txt
├── CLAUDE.md
└── README.md
```

### Refactoring Map: HeAR.ipynb → Target Modules

| Notebook Cell | Content | Target File | Notes |
|---|---|---|---|
| Cell 2 | Data loading, DataFrame construction | `training/train_acoustic.py` | Training-only |
| Cell 6 | `load_and_chunk_audio()` | `agents/audio_process.py` | Shared by training AND inference |
| Cell 13 | HeAR repo clone + `preprocess_audio` import | `agents/hear_embed.py` | Shared by training AND inference |
| Cell 14 | `extract_hear_embeddings()` | `agents/hear_embed.py` | Shared by training AND inference |
| Cell 15 | Batch embedding extraction loop | `training/train_acoustic.py` | Training-only |
| Cell 22 | LogReg with GroupShuffleSplit + GridSearchCV | `training/train_acoustic.py` | Training-only — chosen classifier |
| Cell 20 | LinearSVC (no group split) | DISCARD | Deprecated — causes leakage, no probability output |
| Cell 21 | SVC (group split) | DISCARD | Superseded by LogReg — Platt scaling causes inconsistent probabilities |

**Critical:** `agents/audio_process.py` and `agents/hear_embed.py` are imported by both `training/train_acoustic.py` and the inference graph. This guarantees identical preprocessing between training and inference — no skew possible.

### Architecture — Two Branches, Then Fuse

**Non-Semantic Branch (Organizational agents):**
`audio_process → hear_embed → classifier_acoustic`
- Preprocessing: Librosa loads at 16kHz mono, chunks into strict 2s segments (discard short tails)
- HeAR: official `preprocess_audio` → model forward → 512-dim `pooler_output`, averaged per file
- Classifier: LogisticRegression(class_weight='balanced') → **Prob A (Vocal Frailty Score)** via `predict_proba`

**Semantic Branch (starts with LLM-driven agent):**
`transcription → feature_calc → classifier_semantic`
- MERaLiON-AudioLLM: localized ASR (handles Singlish, code-switching)
- Linguistic Analyzer: detects cognitive footprints — repetitive phrasing, loss of complex nouns, syntactic simplification
- Classifier: → **Prob B (Cognitive Footprint Score)**

**Fusion + Reporting:**
`fusion → report`
- Weighted fusion: `Final Prob = w1 * A + w2 * B`
- Gemini 1.5 Pro: generates empathetic, culturally sensitive report in caregiver's preferred language

---

## Agent Design Pattern (LangGraph Nodes)

### Shared State (Pydantic BaseModel)
All agents operate on a single **`AgentState`** Pydantic model defined in `agents/state.py`. Agents receive the full state object, mutate the fields they own via dot access, and return the full state. LangGraph passes the updated state to the next node.

```python
# agents/state.py
from pydantic import BaseModel, Field
from typing import Any, Optional
import numpy as np

class AgentState(BaseModel):
    # Input — set before graph execution
    audio_file_path: str                    # Path to the raw .wav file
    subject_id: str                         # Subject identifier (for group-aware eval)
    report_language: str                    # Preferred report language: "en", "zh", "ms"
    file_name: str

    # System Log
    messages: list[str] = Field(default_factory=list)

    # Written by audio_process
    audio_chunks: list[np.ndarray]          # List of 2s chunks, each shape (32000,) at 16kHz

    # Written by hear_embed
    embedding: Optional[np.ndarray] = None  # Averaged 512-dim embedding, shape (512,)

    # Written by classifier_acoustic
    acoustic_result: Optional[float] = None

    # Written by transcription (LLM-driven)
    transcript_text: str                    # Raw ASR transcript from MERaLiON
    meralion_acoustic_analysis: str
    meralion_cognitive_insights: str

    # Written by feature_calc
    linguistic_features: Optional[dict[str, Any]] = None

    # Written by classifier_semantic
    semantic_result: Optional[float] = None

    # Written by fusion
    fusion_result: Optional[float] = None

    # Written by report (LLM-driven)
    report: Optional[str] = None
```

### Agent Function Signature
Every agent is a **plain function** (not a class). Signature: `(state: AgentState) -> AgentState`. Each agent reads what it needs via dot access, mutates only the fields it owns, appends to `messages` for logging, and returns the state object.

```python
# Example: agents/audio_process.py
def audio_process_agent(state: AgentState) -> AgentState:
    state.audio_chunks = load_and_chunk_audio(state.audio_file_path)
    state.messages.append(f"[audio_process] Produced {len(state.audio_chunks)} chunks.")
    return state
```

### Two Agent Types
- **Organizational** — deterministic, no LLM. Pure function that transforms state. Examples: `audio_process`, `hear_embed`, `classifier_acoustic`, `feature_calc`, `fusion`.
- **LLM-Driven** — calls an LLM as part of its logic. Examples: `transcription` (MERaLiON), `report` (Gemini). For these, the `.skill.md` file in `agents/skills/` is loaded as part of the system prompt.

### Heavy Model Loading
Agents that load large models (HeAR, sklearn pipeline, MERaLiON) use a **module-level singleton** pattern. The model is loaded once on first call, then reused:

```python
_model = None

def _get_model():
    global _model
    if _model is None:
        _model = load_expensive_thing()
    return _model

def my_agent(state: AgentState) -> AgentState:
    model = _get_model()
    # ... use model, mutate state ...
    return state
```

This avoids reloading multi-GB models on every graph invocation while keeping the agent function itself stateless.

### Graph Wiring
`agents/graph.py` is the only file that knows execution order. Agent files do not import each other. The graph fans out from `audio_process` to both branches in parallel, then converges at `fusion`:

```
                          ┌→ hear_embed → classifier_acoustic ──────┐
audio_process (entry) ────┤                                         ├→ fusion → report (finish)
                          └→ transcription → feature_calc → classifier_semantic ┘
```

### Skill Files
Each agent has a `.skill.md` in `agents/skills/` defining: agent type (organizational / LLM-driven), inputs (which AgentState fields it reads), outputs (which fields it writes), constraints, and for LLM-driven agents, the system prompt content.

**When creating a new agent, write the skill file first.**

---

## Training vs Inference Separation

### Training (run once, on Colab with GPU)
Script: `training/train_acoustic.py`
- Imports `agents/audio_process.py` and `agents/hear_embed.py` to ensure identical preprocessing
- Runs GridSearchCV with `StratifiedGroupKFold` on the full dataset
- Saves three artifacts to `models/`:

| Artifact | Method | Contains |
|---|---|---|
| `acoustic_pipeline.joblib` | `joblib.dump(grid_search.best_estimator_, ...)` | Fitted `StandardScaler → PCA → LogisticRegression` pipeline (includes PCA transform matrix) |
| `hear_model_local/` | `model.save_pretrained(...)` | HeAR weights for offline loading (no HF token needed) |
| `model_metadata.json` | `json.dump(...)` | Best params, CV F1, sklearn/torch/librosa versions |

### Inference (runs per request in the LangGraph pipeline)
- `agents/hear_embed.py` loads HeAR from `models/hear_model_local/` (no network needed)
- `agents/classifier_acoustic.py` loads `models/acoustic_pipeline.joblib` via `joblib.load()`
- The joblib file contains the full fitted pipeline — calling `pipeline.predict_proba()` applies the exact same `StandardScaler` transform, PCA projection, and LogisticRegression prediction as training

### Version Pinning
`model_metadata.json` records the sklearn, torch, and librosa versions used during training. At inference time, verify these match — sklearn pipelines are NOT guaranteed compatible across versions. Use `requirements.txt` to lock versions across both environments.

---

## Shared Constants (`utils/config.py`)
Single source of truth for all magic numbers. Both training and inference import from here:

```python
from pathlib import Path

SAMPLE_RATE = 16000
CHUNK_DURATION = 2.0
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_DURATION)  # 32000

MODEL_DIR = Path("models/")
HEAR_MODEL_PATH = MODEL_DIR / "hear_model_local"
ACOUSTIC_PIPELINE_PATH = MODEL_DIR / "acoustic_pipeline.joblib"

FUSION_WEIGHTS = {"acoustic": 0.5, "semantic": 0.5}  # hyperparameters, tune later
```

---

## Tech Stack
- **Framework**: LangGraph (stateful graph orchestration)
- **Frontend**: Streamlit
- **Acoustic Model**: Google HeAR (`google/hear-pytorch`, ViT-Large, 512-dim embeddings)
- **HeAR Preprocessing**: Official `preprocess_audio` from `google-health/hear` repo (NOT manual mel-spectrogram)
- **Semantic Model**: MERaLiON-AudioLLM (A*STAR, via cr8lab API)
- **Reporting LLM**: Gemini 1.5 Pro
- **Audio Processing**: Librosa (loading + chunking only; spectrogram handled by HeAR official code)
- **ML**: scikit-learn — LogisticRegression(class_weight='balanced') with GroupShuffleSplit / StratifiedGroupKFold
- **Model Serialization**: `joblib` for sklearn pipelines, `save_pretrained` for HeAR
- **State Management**: Pydantic BaseModel (`AgentState` with `arbitrary_types_allowed` for numpy fields)
- **Language**: Python 3.10+

## Key Constraints
- HeAR requires exactly 2s chunks at 16kHz mono — preprocessing must enforce this
- Always use official `preprocess_audio` for HeAR input — never compute mel-spectrograms manually
- Data splitting must be group-aware (by subject_id) to prevent leakage — use GroupShuffleSplit for hold-out, StratifiedGroupKFold for CV
- MERaLiON access is via cr8lab API — treat as external service with latency
- LogisticRegression chosen over SVC for native probability calibration — critical since Prob A feeds into weighted fusion. Revisit classifier choice if dataset grows significantly
- Fusion weights (w1, w2) are hyperparameters; start with equal weighting
- Reports must never give a diagnosis — screening tool only, always include disclaimer
- `np.ndarray` fields in `AgentState` require `arbitrary_types_allowed = True` in the Pydantic Config. These won't serialize natively if LangGraph checkpointing is enabled — store as lists or `.npy` paths if persistence is needed (not an issue for synchronous Streamlit use)

## What NOT To Do
- Do not compute mel-spectrograms manually for HeAR — the Version 1 approach is deprecated
- Do not use LinearSVC for the classifier — it lacks native probability output
- Do not use SVC(probability=True) — Platt scaling produces probabilities inconsistent with predictions; use LogisticRegression instead
- Do not split data without grouping by subject_id — this causes leakage between train/test
- Do not use openSMILE features — HeAR embeddings replace handcrafted features
- Do not hardcode API keys — use environment variables or .env
- Do not put training logic (GridSearchCV, data loading) inside agent files — training lives in `training/`, agents are inference-only
- Do not make agent functions import other agent files — agents communicate only through AgentState; only `graph.py` knows the wiring
- Do not use classes for agent nodes — agents are plain functions `(AgentState) -> AgentState`
- Do not mutate AgentState fields that another agent owns — each agent only writes its own fields (see field ownership comments in `state.py`)
- Do not use TypedDict for AgentState — we use Pydantic BaseModel with dot access and mutate-return pattern
- Do not use dict-key access (`state["field"]`) — use dot access (`state.field`) for consistency with Pydantic
- Do not reload heavy models per invocation — use the module-level singleton pattern
- Do not use `pickle` for sklearn pipelines — use `joblib` (better for large numpy arrays)
- Do not assume sklearn pipeline compatibility across versions — check `model_metadata.json`
