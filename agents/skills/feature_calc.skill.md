---
name: feature_calc
type: organizational
reads: [transcript_text]
writes: [linguistic_features]
---

# Feature Calc Agent

Extracts 31 linguistic features from the MERaLiON transcript for dementia screening. Handles speaker separation (identifies interviewee), language detection (English/Mandarin), and computes features across seven groups: lexical, lexical diversity, word frequency, utterance, filler, syntactic, and coherence.

## Constraints
- spaCy models loaded via module-level cache (en_core_web_sm, zh_core_web_sm)
- Singlish discourse particles excluded from filler counts
- Returns zeroed features gracefully when text is too short (<5 words) or missing
