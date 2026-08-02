# Dementia Screening System

Demo Video: https://youtu.be/0h3oDDz8Zeg
A non-invasive, home-based dementia screening tool that analyses conversational audio recordings using parallel multimodal fusion. One branch analyses **how** a person sounds (acoustic), the other analyses **what** they say (semantic). Results are fused and an LLM generates a caregiver-facing report.

Built for the NUS-SYNAPXE-IMDA Innovation Challenge 2026. Supports English (Singlish) and Mandarin.

---

## Prerequisites

### 1. Python Environment

Python 3.10+ is required. Install all dependencies:

```bash
pip install -r requirements.txt
```

### 2. spaCy Language Models

Download the English and Mandarin NLP models used by the linguistic feature extractor:

```bash
python -m spacy download en_core_web_sm
python -m spacy download zh_core_web_sm
```

### 3. Google HeAR Repository

The official HeAR preprocessing code must be present locally. Clone the repo into the project root:

```bash
git clone https://github.com/google-health/hear.git
```

This provides the `preprocess_audio()` function imported at runtime by the embedding agent. The directory is gitignored — every developer must clone it.

### 4. HeAR Model Weights

The HeAR model (`google/hear-pytorch`, ViT-Large) must be saved locally to `models/hear_model_local/`. This is done once during training:

```python
from transformers import AutoModel

model = AutoModel.from_pretrained("google/hear-pytorch", trust_remote_code=True)
model.save_pretrained("models/hear_model_local")
```

> Requires a Hugging Face token with access to the gated `google/hear-pytorch` model.

### 5. Trained Model Artifacts

The following files in `models/` are required for inference:

| File | Description |
|------|-------------|
| `hear_model_local/` | HeAR weights (~1.2 GB, gitignored) |
| `acoustic_pipeline.joblib` | Fitted StandardScaler + PCA + LogisticRegression (committed) |
| `model_metadata.json` | Acoustic training metadata and version info (committed) |
| `semantic_pipeline.joblib` | Fitted StandardScaler + LogisticRegression (committed) |
| `semantic_metadata.json` | Semantic training metadata and feature order (committed) |

The `.joblib` and `.json` files are checked into the repo. The HeAR weights must be produced via step 4 above.

### 6. Environment Variables

Create a `.env` file in the project root:

```
MERALION_API_KEY=<your cr8lab API key>
GEMINI_API_KEY=<your Google AI API key>   # only if using Gemini for reports
```

- **MERALION_API_KEY** — required for the transcription agent (MERaLiON via cr8lab API).
- **GEMINI_API_KEY** — required only if `REPORT_LLM_PROVIDER` is set to `"gemini"` in `config.py`.

The report agent also uses a local Ollama instance (for example `qwen2.5:3b`). To use this, install [Ollama](https://ollama.com) and pull the model:

```bash
ollama pull qwen2.5:3b
```

### 7. FFmpeg (for non-WAV uploads)

If users will upload audio in M4A, MP3, OGG, or FLAC format, [FFmpeg](https://ffmpeg.org) must be installed and on the system PATH. The app uses `pydub` to convert these to WAV before processing.

---

## Running the App

### Option A: React Frontend (same UI as demo)

Start the FastAPI backend and the React dev server:

```bash
# Terminal 1 — API server
uvicorn app.api:app --reload --port 8000

# Terminal 2 — React frontend
cd Innovation_front
npm install
npm run dev
```

Open http://localhost:3000. The React UI supports in-browser mic recording and file upload, with real-time progress and a styled screening report.

### Option B: Streamlit (quick, lightweight test)

```bash
streamlit run app/streamlit_app.py --server.headless true
```

The Streamlit UI provides:
1. **Upload Audio** tab — upload a recording (WAV, M4A, MP3, OGG, or FLAC), select report language, enter a subject ID, and run the screening pipeline.
2. **Screening Report** tab — view the acoustic score, semantic score, fused score, and the full LLM-generated report.

Both frontends use the same LangGraph pipeline. Models are loaded once and reused across requests.

---

## Project Structure

```
├── app/
│   ├── streamlit_app.py          # Streamlit frontend
│   └── api.py                    # FastAPI backend for React frontend
├── agents/
│   ├── state.py                  # AgentState (Pydantic BaseModel)
│   ├── graph.py                  # LangGraph wiring
│   ├── audio_process.py          # Load + chunk audio (2s @ 16kHz)
│   ├── hear_embed.py             # HeAR embedding extraction
│   ├── classifier_acoustic.py    # Acoustic branch classifier
│   ├── transcription_agent.py    # MERaLiON ASR (cr8lab API)
│   ├── feature_calc.py           # Linguistic feature extraction
│   ├── classifier_semantic.py    # Semantic branch classifier
│   ├── fusion.py                 # Weighted decision fusion
│   ├── report.py                 # LLM report generation
│   ├── skill_store.py            # Loads .skill.md files
│   └── skills/                   # Skill definitions per agent
├── training/                     # Offline training scripts (Colab)
├── models/                       # Trained artifacts
├── config.py                     # Constants and settings
├── hear/                         # google-health/hear clone (gitignored)
├── requirements.txt
└── README.md
```

---

## Dataset Attribution

The audio data used for training and evaluation comes from [**DementiaNet**](https://github.com/shreyasgite/dementianet) by Shreyas Gite — a longitudinal spontaneous speech dataset for dementia screening. It contains recordings of public figures with confirmed dementia diagnoses and control subjects who lived beyond 90 without cognitive decline. DementiaNet is released under the **MIT License** (Copyright (c) 2022 Shreyas Gite).

---

## Third-Party Licenses

| Package | Version | License | URL |
|---------|---------|---------|-----|
| DementiaNet (dataset) | — | MIT | https://github.com/shreyasgite/dementianet |
| PyTorch (`torch`) | 2.10.0 | BSD-3-Clause | https://pytorch.org |
| torchaudio | 2.10.0 | BSD-2-Clause | https://github.com/pytorch/audio |
| Transformers | 5.0.0 | Apache-2.0 | https://github.com/huggingface/transformers |
| Google HeAR (`google/hear-pytorch`) | — | Apache-2.0 | https://github.com/google-health/hear |
| HeAR preprocessing (`google-health/hear`) | — | Apache-2.0 | https://github.com/google-health/hear |
| librosa | 0.11.0 | ISC | https://librosa.org |
| SoundFile | 0.13.1 | BSD-3-Clause | https://github.com/bastibe/python-soundfile |
| scikit-learn | 1.7.1 | BSD-3-Clause | https://scikit-learn.org |
| joblib | 1.5.1 | BSD-3-Clause | https://joblib.readthedocs.io |
| NumPy | 2.1.3 | BSD-3-Clause | https://numpy.org |
| pydub | 0.25.1 | MIT | https://pydub.com |
| spaCy | 3.8.11 | MIT | https://spacy.io |
| wordfreq | 3.1.1 | Apache-2.0 | https://github.com/rspeer/wordfreq |
| langdetect | 1.0.9 | MIT | https://github.com/Mimino666/langdetect |
| sentence-transformers | 5.2.3 | Apache-2.0 | https://sbert.net |
| LangGraph | 1.0.7 | MIT | https://github.com/langchain-ai/langgraph |
| LangChain Core | 1.2.17 | MIT | https://github.com/langchain-ai/langchain |
| langchain-google-genai | 4.2.1 | MIT | https://github.com/langchain-ai/langchain-google |
| langchain-ollama | 1.0.1 | MIT | https://github.com/langchain-ai/langchain |
| Streamlit | 1.55.0 | Apache-2.0 | https://streamlit.io |
| httpx | 0.28.1 | BSD-3-Clause | https://www.python-httpx.org |
| python-dotenv | 1.2.1 | BSD-3-Clause | https://github.com/theskumar/python-dotenv |
| Pydantic | 2.11.7 | MIT | https://docs.pydantic.dev |
| PyYAML | 6.0.2 | MIT | https://pyyaml.org |
| FastAPI | — | MIT | https://fastapi.tiangolo.com |
| uvicorn | — | BSD-3-Clause | https://www.uvicorn.org |
| python-multipart | — | Apache-2.0 | https://github.com/Kludex/python-multipart |
| MERaLiON-AudioLLM | — | ASTAR Research License | https://huggingface.co/MERaLiON |
| React | 19.0.0 | MIT | https://react.dev |
| React DOM | 19.0.0 | MIT | https://react.dev |
| react-markdown | 10.1.0 | MIT | https://github.com/remarkjs/react-markdown |
| Motion (Framer Motion) | 12.23.24 | MIT | https://motion.dev |
| Lucide React | 0.546.0 | ISC | https://lucide.dev |
| MUI Material | 7.3.9 | MIT | https://mui.com |
| MUI Icons Material | 7.3.9 | MIT | https://mui.com |
| Emotion React | 11.14.0 | MIT | https://emotion.sh |
| Emotion Styled | 11.14.1 | MIT | https://emotion.sh |
| Tailwind CSS | 4.1.14 | MIT | https://tailwindcss.com |
| @tailwindcss/typography | 0.5.19 | MIT | https://github.com/tailwindlabs/tailwindcss-typography |
| Vite | 6.2.0 | MIT | https://vite.dev |
| TypeScript | 5.8.2 | Apache-2.0 | https://www.typescriptlang.org |
