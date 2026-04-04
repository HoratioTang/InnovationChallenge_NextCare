import os
from pathlib import Path
import torch

TARGET_SR = 16000
CHUNK_DURATION = 2.0
CHUNK_SAMPLES = int(TARGET_SR * CHUNK_DURATION)

MODEL_DIR = Path("models/")
HEAR_MODEL_PATH = MODEL_DIR / "hear_model_local"
PIPELINE_PATH = MODEL_DIR / "acoustic_pipeline.joblib"
SEMANTIC_PIPELINE_PATH = MODEL_DIR / "semantic_pipeline.joblib"
SEMANTIC_METADATA_PATH = MODEL_DIR / "semantic_metadata.json"

FUSION_WEIGHTS = {"acoustic": 0.5, "semantic": 0.5}


if torch.cuda.is_available():
    DEVICE = "cuda"
elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
    DEVICE = "mps"
else:
    DEVICE = "cpu"
# ============================================================
# Feature Calculation Settings
# ============================================================

# ============================================================
# Model Settings
# ============================================================
 
# Semantic coherence backend
# True  = sentence-transformers (better quality, ~500MB model download)
# False = TF-IDF cosine similarity (lightweight, no GPU needed)
USE_SENTENCE_TRANSFORMERS = False
 
# ============================================================
# Speaker Identification
# ============================================================
 
# If dominant speaker has less than this share of total words,
# flag the case for manual review.
SPEAKER_CONFIDENCE_THRESHOLD = 0.65
 
# ============================================================
# Language Configuration
# ============================================================
 
LANG_CONFIG = {
    'en': {
        'spacy_model': 'en_core_web_sm',
        'wordfreq_code': 'en',
        'label': 'English',
    },
    'zh': {
        'spacy_model': 'zh_core_web_sm',
        'wordfreq_code': 'zh',
        'label': 'Mandarin',
    },
}
 
# Map langdetect output codes → our supported keys
LANGDETECT_MAP = {
    'en': 'en',
    'zh-cn': 'zh',
    'zh-tw': 'zh',
    'zh': 'zh',
    'ko': 'zh',  # langdetect sometimes misclassifies short Chinese as Korean
}
 
# ============================================================
# English Fillers & Empty Speech
# ============================================================
 
FILLERS_UM = {'um', 'umm', 'hmm', 'hm'}
FILLERS_UH = {'uh', 'uhh', 'eh'}
FILLERS_DISCOURSE = {'you know', 'i mean', 'sort of', 'kind of'}
 
# Singlish discourse particles — excluded from filler counts
SINGLISH_PARTICLES = {'lah', 'lor', 'leh', 'meh', 'hor', 'sia'}
 
EN_EMPTY_TERMS = {
    'thing', 'things', 'stuff', 'something', 'anything', 'everything',
    'someone', 'anyone', 'everybody', 'somewhere', 'place',
}
EN_EMPTY_BIGRAMS = {'this one', 'that one', 'those ones'}
 
# ============================================================
# Mandarin Fillers & Empty Speech
# ============================================================
 
ZH_FILLERS_UM = {'嗯', '唔', '呃'}
ZH_FILLERS_UH = {'啊', '呢', '哦'}
ZH_FILLERS_DISCOURSE = {'就是', '然后', '那个', '这个', '怎么说'}
 
ZH_EMPTY_TERMS = {'东西', '那个', '这个', '什么', '那边', '这边', '那里', '这里'}

# ============================================================
# Report Agent LLM Settings
# ============================================================
# Toggle: comment/uncomment ONE of the two blocks below.

# --- Option A: Google Gemini (production) ---
REPORT_LLM_PROVIDER = "gemini"
REPORT_LLM_MODEL = "gemini-2.5-flash"

# --- Option B: Local Ollama (testing) ---
# REPORT_LLM_PROVIDER = "ollama"
# REPORT_LLM_MODEL = "qwen2.5:3b"

# ============================================================
# Dashboard Chatbot Settings
# ============================================================

CHAT_MAX_OUTPUT_TOKENS = 400     # Keep chat responses concise
CHAT_HISTORY_TURNS = 10          # Max conversation turns sent to LLM
CHAT_TRANSCRIPT_WORDS = 300      # Trim transcript to last N words in context

# ============================================================
# Memory System
# ============================================================

MEMORY_BACKEND = os.getenv("MEMORY_BACKEND", "local")  # "local" or "supabase"
MEMORY_LOCAL_PATH = "screening_history.json"

# Feature groups — used for change detection
FEATURE_GROUPS = {
    "lexical": [
        "pronoun_to_noun_ratio", "content_word_density",
        "noun_ratio", "verb_ratio", "pronoun_ratio", "adjective_ratio",
    ],
    "diversity": ["mattr", "mtld", "n_unique_words", "ttr_raw"],
    "frequency": ["mean_word_frequency", "low_freq_word_ratio", "high_freq_word_ratio"],
    "utterance": ["mlu", "sentence_count", "sentence_length_std", "total_word_count"],
    "filler": [
        "filler_um_rate", "filler_uh_rate", "filler_total_rate",
        "um_to_uh_ratio", "discourse_filler_rate", "empty_speech_rate",
    ],
    "syntactic": ["mean_dependency_distance", "max_dependency_distance", "idea_density_proxy"],
    "coherence": [
        "semantic_coherence_mean", "semantic_coherence_std",
        "semantic_coherence_min", "repetitiveness_score", "topic_drift",
    ],
}

# Change detection thresholds
MIN_SESSIONS_FOR_DETECTION = 3   # No flags until this many sessions exist
Z_THRESHOLD = 1.5                # Std devs from baseline to trigger a flag

# Direction mappings for change detection
HIGHER_IS_WORSE = {
    "pronoun_to_noun_ratio", "filler_um_rate", "filler_uh_rate", "filler_total_rate",
    "discourse_filler_rate", "empty_speech_rate", "repetitiveness_score",
    "topic_drift", "semantic_coherence_std",
}

LOWER_IS_WORSE = {
    "mattr", "mtld", "n_unique_words", "ttr_raw", "content_word_density",
    "mlu", "mean_word_frequency", "idea_density_proxy",
    "semantic_coherence_mean", "semantic_coherence_min",
}