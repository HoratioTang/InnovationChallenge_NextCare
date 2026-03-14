from typing import Any, Optional, List
from pydantic import BaseModel, Field
import numpy as np

class AgentState(BaseModel):
    """
    Top-level state for the LangGraph graph.

    Uses TypedDict (LangGraph convention) with `total=False` so that
    fields are optional — they get populated progressively as agents run.

    Fields with `Annotated[..., operator.add]` are append-reducers:
    when multiple agents write to them, values are concatenated rather
    than overwritten. This is used for `flags` since both branches
    contribute flags independently during parallel execution.

    numpy arrays (audio_chunks, embedding) are stored as plain fields.
    LangGraph handles serialization; Pydantic models above handle
    validation of the structured outputs.
    """

    # ---- Input (set before graph execution) ----
    audio_file_path: str                    # Path to the raw .wav file
    subject_id: str                         # Subject identifier (for group-aware eval)
    report_language: str                    # Preferred report language: "en", "zh", "ms"
    file_name: str

    # ---- System Log ----
    messages: list[str] = Field(default_factory=list)

    # ---- Audio Process Agent output ----
    audio_chunks: list[np.ndarray]          # List of 2s chunks, each shape (32000,) at 16kHz
    # audio_metadata: AudioMetadata

    # ---- HeAR Embed Agent output ----
    embedding: Optional[np.ndarray] = None   # Averaged 512-dim embedding, shape (512,)

    # ---- Acoustic Classifier Agent output ----
    acoustic_result: Optional[float] = None 

    # ---- Transcription Agent output (LLM-driven) ----
    transcript_text: str                         # Raw ASR transcript from MERaLiON
    meralion_acoustic_analysis: str
    meralion_cognitive_insights: str

    # ---- Feature Calculation Agent output ----
    linguistic_features: Optional[dict[str, Any]] = None  # e.g. word count, sentiment scores, etc.

    # ---- Semantic Classifier Agent output ----
    semantic_result: Optional[float] = None

    # ---- Fusion Agent output ----
    fusion_result: Optional[float] = None

    # ---- Report Agent output (LLM-driven) ----
    report: Optional[str] = None

    # ---- Shared accumulator (both branches append) ----
    # flags: Annotated[list[str], operator.add]

    # ---- Error tracking ----
    errors: List[str] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True