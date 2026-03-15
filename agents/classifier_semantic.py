"""Semantic classifier agent — runs the trained LogReg pipeline on linguistic features.

Organizational agent (deterministic, no LLM).
Reads:  state.linguistic_features
Writes: state.semantic_result, state.messages
"""

from __future__ import annotations

import json
import math
from typing import TYPE_CHECKING

import joblib
import numpy as np

from config import SEMANTIC_PIPELINE_PATH, SEMANTIC_METADATA_PATH

if TYPE_CHECKING:
    from agents.state import AgentState

# ---------------------------------------------------------------------------
# Module-level singletons (loaded once, reused)
# ---------------------------------------------------------------------------
_pipeline = None
_feature_names: list[str] | None = None


def _get_pipeline():
    global _pipeline
    if _pipeline is None:
        _pipeline = joblib.load(SEMANTIC_PIPELINE_PATH)
    return _pipeline


def _get_feature_names() -> list[str]:
    """Load the canonical feature order from training metadata."""
    global _feature_names
    if _feature_names is None:
        with open(SEMANTIC_METADATA_PATH, "r") as f:
            metadata = json.load(f)
        _feature_names = metadata["feature_names"]
    return _feature_names


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------
def classifier_semantic_agent(state: AgentState) -> AgentState:
    """LangGraph node: predict dementia probability from linguistic features."""
    pipeline = _get_pipeline()
    feature_names = _get_feature_names()

    features = state.linguistic_features
    if features is None:
        state.semantic_result = None
        state.messages.append(
            "[classifier_semantic] Skipped — linguistic_features is None"
        )
        return state

    # Build feature array in the exact column order used during training
    values = []
    for name in feature_names:
        v = features.get(name, 0.0)
        # Training replaced inf with column median; at inference use 0.0 as safe default
        if isinstance(v, float) and (math.isinf(v) or math.isnan(v)):
            v = 0.0
        values.append(v)

    X = np.array([values])

    # Column index 1 is P(dementia) — the positive class
    prob_dementia = float(pipeline.predict_proba(X)[0, 1])

    state.semantic_result = prob_dementia
    state.messages.append(
        f"[classifier_semantic] Cognitive Footprint Score (Prob B): {prob_dementia:.4f}"
    )
    return state
