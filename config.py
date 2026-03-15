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