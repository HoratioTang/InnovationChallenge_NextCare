import operator
from typing import Annotated, Any, List, Optional

import numpy as np
from pydantic import BaseModel, Field

class AgentState(BaseModel):
    """
    Top-level state for the LangGraph graph (Pydantic BaseModel).

    Fields are populated progressively as agents run. Each agent
    returns a dict of only the fields it owns; LangGraph merges them.

    Fields annotated with ``operator.add`` are append-reducers:
    when parallel branches both write to them, values are concatenated
    rather than raising an InvalidUpdateError. Used for ``messages``
    and ``errors`` since both branches log independently.
    """

    # ---- Input (set before graph execution) ----
    audio_file_path: str                    # Path to the raw .wav file
    subject_id: str                         # Subject identifier (for group-aware eval)
    report_language: str                    # Preferred report language: "en", "zh", "ms"
    file_name: str

    # ---- System Log (reducer: concurrent branches concatenate) ----
    messages: Annotated[list[str], operator.add] = Field(default_factory=list)

    # ---- Audio Process Agent output ----
    audio_chunks: list[np.ndarray] = Field(default_factory=list)  # List of 2s chunks, each shape (32000,) at 16kHz
    # audio_metadata: AudioMetadata

    # ---- HeAR Embed Agent output ----
    embedding: Optional[np.ndarray] = None   # Averaged 512-dim embedding, shape (512,)

    # ---- Acoustic Classifier Agent output ----
    acoustic_result: Optional[float] = None 

    # ---- Transcription Agent output (LLM-driven) ----
    transcript_text: str = ""                         # Raw ASR transcript from MERaLiON
    meralion_acoustic_analysis: str = ""
    meralion_cognitive_insights: str = ""

    # ---- Feature Calculation Agent output ----
    detected_language: Optional[str] = None               # Language detected from transcript ('en' or 'zh')
    linguistic_features: Optional[dict[str, Any]] = None  # e.g. word count, sentiment scores, etc.

    # ---- Semantic Classifier Agent output ----
    semantic_result: Optional[float] = None

    # ---- Fusion Agent output ----
    fusion_result: Optional[float] = None

    # ---- Report Agent output (LLM-driven) ----
    report: Optional[str] = None

    # ---- Shared accumulator (both branches append) ----
    # flags: Annotated[list[str], operator.add]

    # ---- Error tracking (reducer: concurrent branches concatenate) ----
    errors: Annotated[list[str], operator.add] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True