---
name: hear_embed
type: organizational
reads: [audio_chunks]
writes: [embedding]
---

# HeAR Embed Agent

Converts audio chunks into a single 512-dim embedding using the Google HeAR model (ViT-Large). Each 2 s chunk is preprocessed via the official `preprocess_audio`, passed through the model to extract `pooler_output`, then all chunk embeddings are averaged per file.

## Constraints
- Uses module-level singleton for model loading (multi-GB weights loaded once)
- HeAR weights loaded from `models/hear_model_local/` (offline, no HF token needed)
- Must use official `preprocess_audio` — never compute mel-spectrograms manually
- Shared by training and inference — do not add inference-only logic here
