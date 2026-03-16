"""HeAR embedding extraction agent — converts audio chunks to 512-dim embeddings.

Organizational agent (deterministic, no LLM).
Reads:  state.audio_chunks
Writes: state.embedding, state.messages
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Callable, List, Optional, TYPE_CHECKING

import numpy as np
import torch
from transformers import AutoModel

from config import DEVICE, HEAR_MODEL_PATH

if TYPE_CHECKING:
    from agents.state import AgentState

# ---------------------------------------------------------------------------
# Import official Google HeAR preprocessing
# ---------------------------------------------------------------------------
# Add the hear repo root so that `hear.python.data_processing.audio_utils`
# is importable.  The repo lives at <project_root>/hear/
_HEAR_REPO_ROOT = Path(__file__).resolve().parent.parent / "hear"
if str(_HEAR_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_HEAR_REPO_ROOT))

import importlib

_audio_utils = importlib.import_module("hear.python.data_processing.audio_utils")
preprocess_audio: Callable[..., torch.Tensor] = _audio_utils.preprocess_audio

# ---------------------------------------------------------------------------
# Module-level singleton for the HeAR model (loaded once, reused)
# ---------------------------------------------------------------------------
_model: Optional[AutoModel] = None


def _get_model() -> AutoModel:
    global _model
    if _model is None:
        _model = AutoModel.from_pretrained(
            str(HEAR_MODEL_PATH), trust_remote_code=True
        ).to(DEVICE)
        _model.eval()
    return _model


# ---------------------------------------------------------------------------
# Core embedding function (shared by training and inference)
# ---------------------------------------------------------------------------
def extract_hear_embeddings(
    chunks: List[np.ndarray],
    model: AutoModel,
    preprocess_func: Callable[..., torch.Tensor],
    device: str,
) -> Optional[np.ndarray]:
    """Extract HeAR embeddings from a list of 2s audio chunks.

    Args:
        chunks: List of numpy arrays, each shape (32000,) at 16 kHz.
        model: Loaded HeAR ViT model.
        preprocess_func: Official ``preprocess_audio`` from google-health/hear.
        device: Torch device string ("cuda", "mps", or "cpu").

    Returns:
        Averaged 512-dim embedding as a numpy array, or None if no chunks.
    """
    if not chunks or len(chunks) == 0:
        return None

    embeddings = []
    model.eval()

    with torch.no_grad():
        for chunk in chunks:
            input_array = np.expand_dims(chunk, axis=0)
            input_tensor = torch.Tensor(input_array)

            try:
                processed_tensor = preprocess_func(input_tensor).to(device)

                output = model.forward(
                    processed_tensor,
                    return_dict=True,
                    output_hidden_states=True,
                )

                if hasattr(output, "pooler_output") and output.pooler_output is not None:
                    emb = output.pooler_output.cpu().detach().numpy().flatten()
                elif hasattr(output, "last_hidden_state"):
                    emb = output.last_hidden_state.mean(dim=1).cpu().detach().numpy().flatten()
                else:
                    emb = output[0].mean(dim=1).cpu().detach().numpy().flatten()

                embeddings.append(emb)

            except Exception as e:
                print(f"Model Inference Error: {e}")
                continue

    return np.mean(embeddings, axis=0) if embeddings else None


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------
def hear_embed_agent(state: AgentState) -> dict:
    """LangGraph node: extract HeAR embeddings from state.audio_chunks."""
    model = _get_model()
    embedding = extract_hear_embeddings(
        state.audio_chunks, model, preprocess_audio, DEVICE
    )
    n_chunks = len(state.audio_chunks)
    emb_shape = embedding.shape if embedding is not None else None
    return {
        "embedding": embedding,
        "messages": [f"[hear_embed] Extracted embedding {emb_shape} from {n_chunks} chunks."],
    }
