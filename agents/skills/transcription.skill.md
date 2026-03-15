---
name: transcription
type: llm-driven
reads: [audio_file_path, file_name]
writes: [transcript_text, meralion_acoustic_analysis, meralion_cognitive_insights]
---

# Transcription Agent

Processes a raw WAV file through the MERaLiON-AudioLLM API (cr8lab) to produce three outputs: an ASR transcript, an acoustic analysis, and cognitive insights. This is the entry point of the semantic branch — `feature_calc` and `classifier_semantic` depend on its outputs.

MERaLiON is chosen for its localized ASR capabilities: it handles Singlish, Mandarin–English code-switching, and Singapore-accented speech that general-purpose ASR models struggle with.

## API Pipeline

1. **Preprocess** — resample audio to 16 kHz mono WAV via Librosa
2. **Upload** — obtain a pre-signed S3 URL from `/upload-url`, PUT the file
3. **Transcribe** — POST to `/transcribe` (temperature 0.1) → raw transcript text
4. **Analyze** — POST to `/analyze` → acoustic analysis (prosody, speech rate, pauses)
5. **Process** — POST to `/process` with dementia-screening instruction → cognitive insights

## Constraints
- Requires `MERALION_API_KEY` environment variable (loaded via `dotenv`) — fails gracefully with error in `state.errors` if missing
- cr8lab API is an external service with latency — read timeout set to 150 s
- Temporary preprocessed WAV is cleaned up in a `finally` block to prevent disk leakage
- Does not import other agent files — communicates only through AgentState

## System Prompt (for `/process` endpoint)
The `/process` call is instructed to "Analyze for dementia signs." — this directs MERaLiON to surface cognitive markers such as word-finding difficulty, repetition, and incoherence in its response.
