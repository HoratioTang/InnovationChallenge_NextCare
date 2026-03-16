"""Acoustic classifier agent — runs the trained LogReg pipeline on HeAR embeddings.

Organizational agent (deterministic, no LLM).
Reads:  state.embedding
Writes: state.acoustic_result, state.messages
"""

from __future__ import annotations

from typing import Optional, TYPE_CHECKING

import joblib
import numpy as np

from config import PIPELINE_PATH

if TYPE_CHECKING:
    from agents.state import AgentState

# ---------------------------------------------------------------------------
# Module-level singleton for the trained pipeline (loaded once, reused)
# ---------------------------------------------------------------------------
_pipeline = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = joblib.load(PIPELINE_PATH)
    return _pipeline


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------
def classifier_acoustic_agent(state: AgentState) -> dict:
    """LangGraph node: predict dementia probability from the HeAR embedding."""
    pipeline = _get_pipeline()

    # predict_proba expects 2D input: (n_samples, n_features)
    X = state.embedding.reshape(1, -1)

    # Column index 1 is P(dementia) — the positive class
    prob_dementia = float(pipeline.predict_proba(X)[0, 1])

    return {
        "acoustic_result": prob_dementia,
        "messages": [f"[classifier_acoustic] Vocal Frailty Score (Prob A): {prob_dementia:.4f}"],
    }
