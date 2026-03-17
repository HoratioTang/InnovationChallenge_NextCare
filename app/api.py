"""NextCare — FastAPI backend for the React frontend.

Single endpoint: POST /api/screen
Accepts an audio file + metadata, runs the LangGraph pipeline,
returns screening results as JSON.
"""

import sys
import tempfile
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydub import AudioSegment

# Ensure project root is on sys.path so agent imports resolve
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from agents.graph import build_graph

# =====================================================================
# App setup
# =====================================================================

app = FastAPI(title="NextCare Screening API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Build pipeline once at module level (equivalent to Streamlit's @st.cache_resource)
_pipeline = build_graph()

# =====================================================================
# Audio conversion
# =====================================================================

SUPPORTED_EXTENSIONS = {".wav", ".m4a", ".mp3", ".ogg", ".flac", ".webm"}


def _ensure_wav(file_path: str) -> str:
    """Convert audio file to 16kHz mono WAV if needed. Returns path to WAV file."""
    path = Path(file_path)
    if path.suffix.lower() == ".wav":
        return file_path

    audio = AudioSegment.from_file(file_path)
    audio = audio.set_frame_rate(16000).set_channels(1)

    wav_path = path.with_suffix(".wav")
    audio.export(str(wav_path), format="wav")

    path.unlink(missing_ok=True)
    return str(wav_path)


# =====================================================================
# Response schema
# =====================================================================


class ScreeningResponse(BaseModel):
    acoustic_result: Optional[float] = None
    semantic_result: Optional[float] = None
    fusion_result: Optional[float] = None
    report: Optional[str] = None
    messages: list[str] = []
    errors: list[str] = []
    transcript_text: str = ""
    meralion_acoustic_analysis: str = ""
    meralion_cognitive_insights: str = ""
    linguistic_features: Optional[dict[str, Any]] = None


# =====================================================================
# Endpoint
# =====================================================================


@app.post("/api/screen", response_model=ScreeningResponse)
async def screen(
    audio: UploadFile = File(...),
    subject_id: str = Form("anonymous"),
    report_language: str = Form("en"),
):
    """Run the full screening pipeline on an uploaded audio file."""
    # Save uploaded file to a temp path
    suffix = Path(audio.filename or "upload.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        temp_path = tmp.name

    try:
        # Convert to 16kHz mono WAV if needed
        temp_path = _ensure_wav(temp_path)

        # Run pipeline
        result = _pipeline.invoke({
            "audio_file_path": temp_path,
            "subject_id": subject_id,
            "report_language": report_language,
            "file_name": audio.filename or "upload.wav",
        })

        # Return only JSON-serializable fields (exclude numpy arrays)
        return ScreeningResponse(
            acoustic_result=result.get("acoustic_result"),
            semantic_result=result.get("semantic_result"),
            fusion_result=result.get("fusion_result"),
            report=result.get("report"),
            messages=result.get("messages", []),
            errors=result.get("errors", []),
            transcript_text=result.get("transcript_text", ""),
            meralion_acoustic_analysis=result.get("meralion_acoustic_analysis", ""),
            meralion_cognitive_insights=result.get("meralion_cognitive_insights", ""),
            linguistic_features=result.get("linguistic_features"),
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)
