"""NextCare — FastAPI backend for the React frontend.

Endpoints:
  POST /api/screen                              — Run screening pipeline on uploaded audio
  POST /api/report/pdf                          — Export screening results as a PDF report
  GET  /api/subjects                            — List all subjects
  GET  /api/subjects/{id}/history               — Score timeline for a subject
  GET  /api/subjects/{id}/sessions/{sid}        — Full session detail
  GET  /api/subjects/{id}/feature-trends        — Feature time series
  GET  /api/subjects/{id}/baselines             — Baseline stats
  GET  /api/subjects/{id}/change-summary        — Change flags vs baseline
  DELETE /api/subjects/{id}                     — Remove a subject
  POST /api/subjects/{id}/chat                  — Chatbot Q&A about a subject's history
"""

import logging
import sys
import tempfile
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from pydub import AudioSegment

# Ensure project root is on sys.path so agent imports resolve
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from agents.graph import build_graph
from app.pdf_report import generate_report_pdf
from config import MEMORY_BACKEND, MEMORY_LOCAL_PATH

logger = logging.getLogger(__name__)

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

# Initialize memory store
if MEMORY_BACKEND == "local":
    from app.memory_local import LocalMemoryStore
    memory = LocalMemoryStore(MEMORY_LOCAL_PATH)
else:
    raise ValueError(f"Unknown MEMORY_BACKEND: {MEMORY_BACKEND}")

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
    session_id: Optional[str] = None
    change_flags: list[dict] = []


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

        # Extract audio metadata before numpy arrays are discarded
        chunk_count = len(result.get("audio_chunks", []))
        audio_metadata = {
            "language": result.get("detected_language"),
            "duration_sec": chunk_count * 2.0,
            "chunk_count": chunk_count,
        }

        # Persist to memory (failures must not break screening)
        session_id = None
        change_flags: list[dict] = []
        try:
            session_id = memory.save_session(
                subject_id, result, audio_metadata=audio_metadata,
            )
            change_flags = memory.get_change_flags(subject_id)
        except Exception:
            logger.exception("Memory save failed for subject %s", subject_id)

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
            session_id=session_id,
            change_flags=change_flags,
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)


# =====================================================================
# PDF export
# =====================================================================


class PdfExportRequest(BaseModel):
    acoustic_result: Optional[float] = None
    semantic_result: Optional[float] = None
    fusion_result: Optional[float] = None
    report: Optional[str] = None
    subject_id: str = "anonymous"


@app.post("/api/report/pdf")
async def export_pdf(data: PdfExportRequest):
    """Generate a PDF report from screening results."""
    pdf_bytes = generate_report_pdf(
        acoustic_result=data.acoustic_result,
        semantic_result=data.semantic_result,
        fusion_result=data.fusion_result,
        report_text=data.report,
        subject_id=data.subject_id,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=nextcare-report.pdf"},
    )


# =====================================================================
# Memory / longitudinal tracking endpoints
# =====================================================================


@app.get("/api/subjects")
async def get_subjects():
    """List all subjects with session counts."""
    return memory.list_subjects()


@app.get("/api/subjects/{subject_id}/history")
async def get_history(subject_id: str):
    """Get all sessions for a subject, chronologically."""
    return memory.get_history(subject_id)


@app.get("/api/subjects/{subject_id}/sessions/{session_id}")
async def get_session(subject_id: str, session_id: str):
    """Get full details for a specific session."""
    session = memory.get_session(subject_id, session_id)
    if session is None:
        return {"error": "Session not found"}
    return session


@app.get("/api/subjects/{subject_id}/feature-trends")
async def get_feature_trends(
    subject_id: str,
    features: str = Query(..., description="Comma-separated feature names"),
):
    """Get time-series data for specific features."""
    feature_list = [f.strip() for f in features.split(",")]
    return memory.get_feature_trends(subject_id, feature_list)


@app.get("/api/subjects/{subject_id}/baselines")
async def get_baselines(subject_id: str):
    """Get current baseline statistics for all features."""
    return memory.get_baselines(subject_id)


@app.get("/api/subjects/{subject_id}/change-summary")
async def get_change_summary(subject_id: str):
    """Get change flags comparing latest session to baseline."""
    return {
        "subject_id": subject_id,
        "flags": memory.get_change_flags(subject_id),
    }


@app.delete("/api/subjects/{subject_id}")
async def delete_subject(subject_id: str):
    """Remove a subject and all their data."""
    memory.delete_subject(subject_id)
    return {"status": "deleted", "subject_id": subject_id}


# =====================================================================
# Dashboard chatbot
# =====================================================================


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.post("/api/subjects/{subject_id}/chat")
async def subject_chat(subject_id: str, request: ChatRequest):
    """Conversational Q&A about a subject's screening history."""
    from app.chat import handle_chat

    try:
        reply = await handle_chat(memory, subject_id, request.message, request.history)
        return {"reply": reply}
    except Exception:
        logger.exception("Chat failed for subject %s", subject_id)
        return {"reply": "Sorry, I couldn't process that request. Please try again."}
