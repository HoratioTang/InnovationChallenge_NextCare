---
name: audio_process
type: organizational
reads: [audio_file_path]
writes: [audio_chunks]
---

# Audio Process Agent

Loads a raw WAV file via Librosa (16 kHz mono) and splits it into strict 2-second chunks. Tail segments shorter than 2 s are discarded. This is the entry node of the graph — both branches depend on its output.

## Constraints
- Chunk duration and sample rate are defined in `config.py` (`CHUNK_DURATION`, `TARGET_SR`)
- Shared by training and inference — do not add inference-only logic here
