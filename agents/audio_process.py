"""Audio preprocessing agent — loads a WAV file and chunks into strict 2s segments.

Organizational agent (deterministic, no LLM).
Reads:  state.audio_path
Writes: state.audio_chunks, state.messages
"""

from __future__ import annotations

from typing import List, TYPE_CHECKING

import numpy as np
import librosa

from config import TARGET_SR, CHUNK_DURATION, CHUNK_SAMPLES

if TYPE_CHECKING:
    from agents.state import AgentState


def load_and_chunk_audio(
    file_path: str,
    target_sr: int = TARGET_SR,
    chunk_duration: float = CHUNK_DURATION,
) -> List[np.ndarray]:
    """Load an audio file and chunk it into fixed-length segments.

    Args:
        file_path: Path to the WAV file.
        target_sr: Target sample rate (default 16 kHz).
        chunk_duration: Duration of each chunk in seconds (default 2.0).

    Returns:
        List of numpy arrays, each with exactly ``target_sr * chunk_duration``
        samples. Tail segments shorter than the chunk length are discarded.
    """
    y, _ = librosa.load(file_path, sr=target_sr, mono=True)

    chunk_samples = int(target_sr * chunk_duration)
    chunks = []

    for i in range(0, len(y), chunk_samples):
        chunk = y[i : i + chunk_samples]
        if len(chunk) == chunk_samples:
            chunks.append(chunk)

    return chunks


def audio_process_agent(state: AgentState) -> dict:
    """LangGraph node: load and chunk the audio file in state.audio_file_path."""
    chunks = load_and_chunk_audio(state.audio_file_path)
    return {
        "audio_chunks": chunks,
        "messages": [f"[audio_process] Produced {len(chunks)} chunks from {state.audio_file_path}."],
    }
