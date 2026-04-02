# Dementia Screening System

## What This Is
A non-invasive, home-based dementia screening tool for the NUS MSBA DBA5102 Innovation Challenge. Analyzes 7-day conversational audio recordings using a **parallel multimodal fusion** architecture: one branch analyzes *how* a person sounds (acoustic), the other analyzes *what* they say (semantic). Results are fused and an LLM generates a caregiver-facing report.

Target context: Singapore — supports English, Mandarin, and Singlish.

---

## Project Structure
```
Code/
├── app/                            # Application layer
│   ├── streamlit_app.py            # Streamlit UI (2-tab: upload + report)
│   ├── api.py                      # FastAPI REST backend (/api/screen, /api/report/pdf)
│   └── pdf_report.py               # PDF export generator (fpdf2)
├── agents/                         # LangGraph agent nodes (one function per file)
│   ├── state.py                    # Shared AgentState Pydantic BaseModel
│   ├── graph.py                    # Main LangGraph graph wiring all agents
│   ├── skill_store.py              # Utility: loads .skill.md files at runtime
│   ├── audio_process.py            # Org: load audio + chunk to 2s segments
│   ├── hear_embed.py               # Org: extract 512-dim HeAR embeddings
│   ├── classifier_acoustic.py      # Org: LogReg predict_proba on embeddings
│   ├── transcription_agent.py      # LLM-driven: MERaLiON API (ASR + analysis)
│   ├── feature_calc.py             # Org: extract 31 linguistic features
│   ├── classifier_semantic.py      # Org: LogReg predict_proba on features
│   ├── fusion.py                   # Org: weighted decision fusion
│   ├── report.py                   # LLM-driven: Gemini report generation
│   └── skills/                     # Skill definition files (.skill.md per agent)
│       ├── audio_process.skill.md
│       ├── hear_embed.skill.md
│       ├── classifier_acoustic.skill.md
│       ├── transcription.skill.md
│       ├── feature_calc.skill.md
│       ├── classifier_semantic.skill.md
│       └── report.skill.md
├── models/                         # Trained model artifacts (gitignored)
│   ├── hear_model_local/           # HeAR weights (save_pretrained)
│   ├── acoustic_pipeline.joblib    # Fitted StandardScaler → PCA → LogReg (acoustic)
│   ├── semantic_pipeline.joblib    # Fitted LogReg pipeline (semantic)
│   └── semantic_metadata.json      # Feature names/order for semantic classifier
├── hear/                           # Google HeAR repo (cloned, provides preprocess_audio)
├── Innovation_front/               # React frontend (npm project, talks to FastAPI)
├── docs/                           # Deployment & feature documentation
│   ├── cloud_run_deployment.md
│   ├── vertex_ai_hear_deployment.md
│   └── feature_pdf_export.md
├── tests/                          # Test suite (gitignored — local only)
│   ├── test_feature_calc.py
│   ├── test_classifier_semantic.py
│   ├── test_full_pipeline.py
│   ├── test_graph_integration.py
│   ├── test_report.py
│   └── test_skill_store.py
├── data/                           # Audio samples
│   ├── dementia/                   # label=1 — <Subject>/<n>_<years_before_dx>.wav
│   └── nodementia/                 # label=0 — <Subject>/<n>_<clip_number>.wav
├── HeAR.ipynb                      # Original acoustic pipeline notebook (reference only)
├── config.py                       # All constants, paths, thresholds (single source of truth)
├── requirements.txt                # Pinned Python dependencies
├── .env                            # API keys: HF_token, MERALION_API_KEY, GEMINI_API_KEY
├── API_DOCUMENT.md
├── CLAUDE.md
└── README.md
```

---

## Architecture — Two Branches, Then Fuse

Both branches fan out from `START` in parallel, then converge at `fusion`:

```
START ─┬→ audio_process → hear_embed → classifier_acoustic ────────┐
       │                                                            ├→ fusion → report (finish)
       └→ transcription → feature_calc → classifier_semantic ───────┘
```

**Acoustic Branch (Organizational agents):**
`audio_process → hear_embed → classifier_acoustic`
- Librosa loads at 16kHz mono, chunks into strict 2s segments (discard short tails)
- HeAR: official `preprocess_audio` → model forward → 512-dim `pooler_output`, averaged per file
- LogisticRegression(class_weight='balanced') → **Prob A (Vocal Frailty Score)** via `predict_proba`

**Semantic Branch (starts with LLM-driven agent):**
`transcription → feature_calc → classifier_semantic`
- MERaLiON-AudioLLM (cr8lab API): localized ASR + acoustic analysis + cognitive insights
- Linguistic Analyzer: extracts 31 cognitive footprint features (lexical, syntactic, coherence, fillers)
- LogisticRegression → **Prob B (Cognitive Footprint Score)** via `predict_proba`

**Fusion + Reporting:**
`fusion → report`
- Weighted fusion: `Final Prob = w1 * A + w2 * B` (default 0.5/0.5)
- Gemini 2.5 Flash: generates empathetic, culturally sensitive report in caregiver's preferred language

---

## Agent Design Pattern (LangGraph Nodes)

### Shared State (Pydantic BaseModel)
All agents operate on a single **`AgentState`** Pydantic model defined in `agents/state.py`. Agents read via dot access and return a partial dict of only their owned fields.

```python
# agents/state.py
import operator
from typing import Annotated, Any, List, Optional
import numpy as np
from pydantic import BaseModel, Field

class AgentState(BaseModel):
    # Input — set before graph execution
    audio_file_path: str
    subject_id: str
    report_language: str                    # "en", "zh", "ms"
    file_name: str

    # System Log (reducer: concurrent branches concatenate)
    messages: Annotated[list[str], operator.add] = Field(default_factory=list)

    # Written by audio_process
    audio_chunks: list[np.ndarray] = Field(default_factory=list)

    # Written by hear_embed
    embedding: Optional[np.ndarray] = None

    # Written by classifier_acoustic
    acoustic_result: Optional[float] = None

    # Written by transcription (LLM-driven)
    transcript_text: str = ""
    meralion_acoustic_analysis: str = ""
    meralion_cognitive_insights: str = ""

    # Written by feature_calc
    linguistic_features: Optional[dict[str, Any]] = None

    # Written by classifier_semantic
    semantic_result: Optional[float] = None

    # Written by fusion
    fusion_result: Optional[float] = None

    # Written by report (LLM-driven)
    report: Optional[str] = None

    # Error tracking (reducer: concurrent branches concatenate)
    errors: Annotated[list[str], operator.add] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True
```

**Key details:**
- `messages` and `errors` use `Annotated[list[str], operator.add]` — this is required so parallel branches can both append without `InvalidUpdateError`.
- `transcript_text`, `meralion_acoustic_analysis`, `meralion_cognitive_insights` default to `""` (not required inputs).
- `np.ndarray` fields require `arbitrary_types_allowed = True` in Config.

### Agent Function Signature
Every agent is a **plain function** (not a class). Signature: `(state: AgentState) -> dict`. Each agent reads what it needs via dot access and returns a dict containing **only the fields it owns** plus `messages`/`errors`. LangGraph merges the partial dict into the state.

```python
# Example: agents/audio_process.py
def audio_process_agent(state: AgentState) -> dict:
    chunks = load_and_chunk_audio(state.audio_file_path)
    return {
        "audio_chunks": chunks,
        "messages": [f"[audio_process] Produced {len(chunks)} chunks."],
    }
```

### Two Agent Types
- **Organizational** — deterministic, no LLM. Pure function that transforms state. Examples: `audio_process`, `hear_embed`, `classifier_acoustic`, `feature_calc`, `classifier_semantic`, `fusion`.
- **LLM-Driven** — calls an LLM or external API. Examples: `transcription_agent` (MERaLiON cr8lab API), `report` (Gemini). For LLM agents, the `.skill.md` file in `agents/skills/` is loaded as part of the system prompt.

### Heavy Model Loading
Agents that load large models (HeAR, sklearn pipelines) use a **module-level singleton** pattern:

```python
_model = None

def _get_model():
    global _model
    if _model is None:
        _model = load_expensive_thing()
    return _model

def my_agent(state: AgentState) -> dict:
    model = _get_model()
    # ... use model ...
    return {"my_field": result, "messages": [...]}
```

### Graph Wiring
`agents/graph.py` is the only file that knows execution order. Agent files do not import each other. Built with `StateGraph(AgentState)` and `.compile()`.

### Skill Files
Each agent has a `.skill.md` in `agents/skills/` defining: agent type (organizational / LLM-driven), inputs (which AgentState fields it reads), outputs (which fields it writes), constraints, and for LLM-driven agents, the system prompt content. Two parts: YAML header + Markdown body.

**When creating a new agent, write the skill file first.**

---

## HeAR Model Details (`google/hear-pytorch`)
- ViT-Large: 24 layers, 1024 hidden dim, pooler projects to 512-dim
- Load with `trust_remote_code=True`
- Audio: 16kHz mono, strict 2s chunks (shorter tail chunks discarded)
- Embeddings from `pooler_output` (512-dim), averaged across all chunks per file
- Fallback: average of `last_hidden_state` if pooler unavailable

### HeAR Preprocessing
Uses the official Google HeAR preprocessing from the embedded `hear/` repo. Imports `preprocess_audio` from `hear.python.data_processing.audio_utils`. The function handles all spectrogram conversion internally — no manual mel-spectrogram code needed. The flow is:
1. Raw chunk as numpy array → `np.expand_dims(chunk, axis=0)` → `torch.Tensor`
2. Pass through `preprocess_audio()` → returns model-ready 4D tensor
3. `model.forward(processed_tensor, return_dict=True, output_hidden_states=True)`
4. Extract `pooler_output` (512-dim)

---

## Classifier Details

### Acoustic Classifier
`LogisticRegression(class_weight='balanced')` with group-aware data splitting.
- Pipeline: `StandardScaler → PCA → LogisticRegression(class_weight='balanced')`
- Training used `GroupShuffleSplit` (hold-out) and `StratifiedGroupKFold(n_splits=5)` (CV)
- Grid search: `pca__n_components` in {10, 20, 30, 50, 0.95}, `clf__C` in {0.001, 0.01, 0.1, 1, 10}
- LogReg produces native, well-calibrated probabilities — no Platt scaling needed

**Why LogReg over SVC:** SVC with `probability=True` uses Platt scaling which can produce probabilities inconsistent with predictions (e.g., predicted=1 but P(dementia)=0.36). LogReg and SVC achieve near-identical performance on this dataset (~0.47 F1, ~0.71 AUC-ROC), so we pick the model with natively consistent probabilities.

### Semantic Classifier
`LogisticRegression` on a subset of 31 linguistic features.
- Pipeline: `models/semantic_pipeline.joblib`
- Feature order: `models/semantic_metadata.json` (list of selected feature names — must match training order exactly)
- Inf/NaN values replaced with 0.0; missing features default to 0.0

### Feature Extraction (31 features)
Extracted by `agents/feature_calc.py` (~589 lines). Groups:
- **Lexical (6):** pronoun_to_noun_ratio, content_word_density, noun/verb/pronoun/adjective ratios
- **Lexical Diversity (4):** MATTR, MTLD, unique words, raw TTR
- **Word Frequency (3):** mean Zipf frequency, low/high freq word ratios
- **Utterance (4):** MLU, sentence count, sentence length std, total word count
- **Fillers (6):** um/uh/total rates, um-to-uh ratio, discourse filler rate, empty speech rate
- **Syntactic (3):** mean/max dependency distance, idea density proxy
- **Coherence (5):** semantic coherence mean/std/min, repetitiveness, topic drift

Language-aware: supports English (spacy `en_core_web_sm`) and Mandarin (spacy `zh_core_web_sm`).

---

## Training vs Inference Separation

### Training (done in HeAR.ipynb on Colab with GPU)
Training was performed in the `HeAR.ipynb` notebook and produced artifacts saved to `models/`. There is no standalone training script — the notebook serves as the training record.

Artifacts in `models/`:

| Artifact | Method | Contains |
|---|---|---|
| `acoustic_pipeline.joblib` | `joblib.dump()` | Fitted `StandardScaler → PCA → LogisticRegression` pipeline |
| `semantic_pipeline.joblib` | `joblib.dump()` | Fitted LogisticRegression pipeline for linguistic features |
| `semantic_metadata.json` | `json.dump()` | Feature names and order for semantic classifier |
| `hear_model_local/` | `model.save_pretrained()` | HeAR weights for offline loading (no HF token needed) |

### Inference (runs per request in the LangGraph pipeline)
- `agents/hear_embed.py` loads HeAR from `models/hear_model_local/` (no network needed)
- `agents/classifier_acoustic.py` loads `models/acoustic_pipeline.joblib` via `joblib.load()`
- `agents/classifier_semantic.py` loads `models/semantic_pipeline.joblib` and `models/semantic_metadata.json`
- The joblib files contain the full fitted pipelines — `predict_proba()` applies the exact same transforms as training

### Version Pinning
`requirements.txt` pins sklearn, torch, and librosa versions. sklearn pipelines are NOT guaranteed compatible across versions.

---

## Shared Constants (`config.py`)
Single source of truth for all magic numbers. Key settings:

```python
from pathlib import Path
import torch

TARGET_SR = 16000
CHUNK_DURATION = 2.0
CHUNK_SAMPLES = int(TARGET_SR * CHUNK_DURATION)  # 32000

MODEL_DIR = Path("models/")
HEAR_MODEL_PATH = MODEL_DIR / "hear_model_local"
PIPELINE_PATH = MODEL_DIR / "acoustic_pipeline.joblib"
SEMANTIC_PIPELINE_PATH = MODEL_DIR / "semantic_pipeline.joblib"
SEMANTIC_METADATA_PATH = MODEL_DIR / "semantic_metadata.json"

FUSION_WEIGHTS = {"acoustic": 0.5, "semantic": 0.5}

# Auto-detected: cuda > mps > cpu
DEVICE = "cuda" | "mps" | "cpu"

# Semantic coherence: False = TF-IDF (lightweight), True = sentence-transformers
USE_SENTENCE_TRANSFORMERS = False

# Speaker identification
SPEAKER_CONFIDENCE_THRESHOLD = 0.65

# Report LLM
REPORT_LLM_PROVIDER = "gemini"        # or "ollama"
REPORT_LLM_MODEL = "gemini-2.5-flash"

# Language support, filler word lists, empty speech terms — see config.py for full details
LANG_CONFIG = {'en': {...}, 'zh': {...}}
```

---

## Application Layer

### Streamlit UI (`app/streamlit_app.py`)
Two-tab interface:
- **Tab 1 (Upload):** File uploader (WAV, M4A, MP3, OGG, FLAC), language selector, subject ID, audio preview, "Run Screening" button
- **Tab 2 (Report):** Color-coded score bars (green < 0.3, orange < 0.7, red >= 0.7), summary, full markdown report, pipeline log, disclaimer

Pipeline built once with `@st.cache_resource`. Results stored in `st.session_state`.

Running: `streamlit run app/streamlit_app.py --server.headless true`

### FastAPI Backend (`app/api.py`)
- `POST /api/screen` — Upload audio file, returns all scores + report + transcript
- `POST /api/report/pdf` — Export screening results as PDF
- CORS configured for `localhost:3000` (React frontend)
- Accepts WAV, M4A, MP3, OGG, FLAC, WEBM; converts to 16kHz mono WAV internally

Running: `uvicorn app.api:app --reload`

### React Frontend (`Innovation_front/`)
Separate React app that talks to the FastAPI backend.

### PDF Export (`app/pdf_report.py`)
Generates PDF reports using `fpdf2`: header, assessment summary table with risk levels, detailed report text, disclaimer.

---

## Tech Stack
- **Orchestration**: LangGraph (stateful graph with parallel fan-out)
- **Backend**: FastAPI + Uvicorn
- **Frontend**: Streamlit (standalone) and React (via FastAPI)
- **Acoustic Model**: Google HeAR (`google/hear-pytorch`, ViT-Large, 512-dim embeddings)
- **HeAR Preprocessing**: Official `preprocess_audio` from embedded `hear/` repo
- **Semantic Model**: MERaLiON-AudioLLM (A*STAR, via cr8lab API)
- **Reporting LLM**: Gemini 2.5 Flash (via `langchain-google-genai`), with Ollama fallback
- **Audio Processing**: Librosa (loading + chunking), pydub (format conversion)
- **NLP**: spacy (POS/dependency parsing), wordfreq (Zipf frequencies), langdetect (language detection)
- **ML**: scikit-learn — LogisticRegression(class_weight='balanced')
- **Model Serialization**: `joblib` for sklearn pipelines, `save_pretrained` for HeAR
- **State Management**: Pydantic BaseModel with `operator.add` reducers
- **PDF**: fpdf2
- **Language**: Python 3.10+

## Environment Setup
- API keys in `.env`: `HF_token`, `MERALION_API_KEY`, `GEMINI_API_KEY`
- Hugging Face token required for initial HeAR download (gated model); not needed at inference if `hear_model_local/` exists
- `python-dotenv` loads `.env` automatically

## Key Constraints
- HeAR requires exactly 2s chunks at 16kHz mono — preprocessing must enforce this
- Always use official `preprocess_audio` for HeAR input — never compute mel-spectrograms manually
- Data splitting must be group-aware (by subject_id) to prevent leakage — use GroupShuffleSplit for hold-out, StratifiedGroupKFold for CV
- MERaLiON access is via cr8lab API — treat as external service with latency
- LogisticRegression chosen over SVC for native probability calibration — critical since scores feed into weighted fusion
- Fusion weights (w1, w2) are hyperparameters in `config.py`; currently equal weighting
- Reports must never give a diagnosis — screening tool only, always include disclaimer
- `np.ndarray` fields in `AgentState` require `arbitrary_types_allowed = True` in Pydantic Config
- `messages` and `errors` fields must use `Annotated[list[str], operator.add]` reducers for parallel fan-out compatibility

## What NOT To Do
- Do not compute mel-spectrograms manually for HeAR — use official `preprocess_audio`
- Do not use LinearSVC or SVC(probability=True) — use LogisticRegression for consistent probabilities
- Do not split data without grouping by subject_id — this causes leakage
- Do not use openSMILE features — HeAR embeddings replace handcrafted acoustic features
- Do not hardcode API keys — use `.env` with `python-dotenv`
- Do not make agent functions import other agent files — agents communicate only through AgentState; only `graph.py` knows the wiring
- Do not use classes for agent nodes — agents are plain functions `(AgentState) -> dict`
- Do not mutate AgentState fields that another agent owns — each agent only writes its own fields
- Do not return the full AgentState from agent functions — return a partial dict of only owned fields (required for parallel fan-out)
- Do not use dict-key access (`state["field"]`) when reading state — use dot access (`state.field`)
- Do not reload heavy models per invocation — use the module-level singleton pattern
- Do not use `pickle` for sklearn pipelines — use `joblib`
- Do not assume sklearn pipeline compatibility across versions — pin versions in `requirements.txt`
- Do not use `list[str]` without `Annotated[..., operator.add]` for fields written by parallel branches — this causes `InvalidUpdateError`
