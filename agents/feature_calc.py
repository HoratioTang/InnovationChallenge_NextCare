"""
agents/feature_calc.py — Linguistic Feature Extraction Agent (Organizational)

Extracts validated linguistic features from a MERaLiON transcript string
for dementia screening. Runs as a LangGraph node in the Semantic Branch.

Pipeline position:
    Transcription Agent (LLM) → **Feature Calc (this)** → Classifier Semantic

Input from AgentState:
    state.transcript_text: str          # Raw ASR transcript from MERaLiON

Output to AgentState:
    state.linguistic_features: dict     # Feature vector for classifier
    state.speaker_info: dict            # Speaker separation metadata
    state.detected_language: str        # 'en' or 'zh'

Dependencies:
    pip install spacy wordfreq taaled langdetect jieba
    python -m spacy download en_core_web_sm
    python -m spacy download zh_core_web_sm
"""

import re
import warnings
import numpy as np
from collections import Counter, defaultdict

from typing import TYPE_CHECKING

import spacy
from wordfreq import zipf_frequency
from langdetect import detect
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import (
    LANG_CONFIG,
    LANGDETECT_MAP,
    SPEAKER_CONFIDENCE_THRESHOLD,
    USE_SENTENCE_TRANSFORMERS,
    FILLERS_UM,
    FILLERS_UH,
    FILLERS_DISCOURSE,
    SINGLISH_PARTICLES,
    ZH_FILLERS_UM,
    ZH_FILLERS_UH,
    ZH_FILLERS_DISCOURSE,
    EN_EMPTY_TERMS,
    EN_EMPTY_BIGRAMS,
    ZH_EMPTY_TERMS,
)

if TYPE_CHECKING:
    from agents.state import AgentState

warnings.filterwarnings('ignore')


# ============================================================
# Model Loading (cached at module level — loaded once)
# ============================================================

_spacy_cache: dict = {}


def _get_spacy_model(lang_key: str):
    """Load and cache spaCy model for a supported language."""
    if lang_key not in LANG_CONFIG:
        lang_key = 'en'

    model_name = LANG_CONFIG[lang_key]['spacy_model']

    if model_name not in _spacy_cache:
        try:
            _spacy_cache[model_name] = spacy.load(model_name)
        except OSError:
            if lang_key != 'en' and 'en_core_web_sm' in _spacy_cache:
                return _spacy_cache['en_core_web_sm']
            return None

    return _spacy_cache[model_name]


# Pre-load English on import
try:
    _spacy_cache['en_core_web_sm'] = spacy.load('en_core_web_sm')
except OSError:
    pass

# Try Mandarin
try:
    _spacy_cache['zh_core_web_sm'] = spacy.load('zh_core_web_sm')
except OSError:
    pass

# Optional: sentence-transformers
_st_model = None
if USE_SENTENCE_TRANSFORMERS:
    try:
        from sentence_transformers import SentenceTransformer
        _st_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    except ImportError:
        pass


# ============================================================
# Language Detection
# ============================================================

def _detect_language(text: str) -> str:
    """Detect English vs Mandarin. Falls back to 'en'."""
    try:
        raw = detect(text)
        return LANGDETECT_MAP.get(raw, 'en')
    except Exception:
        return 'en'


# ============================================================
# Speaker Separation
# ============================================================

def _parse_speakers(transcript: str) -> dict[str, list[str]]:
    """Parse MERaLiON transcript into per-speaker text segments."""
    speaker_texts = defaultdict(list)

    parts = re.split(r'(<Speaker\s*\d+>\s*:?\s*)', transcript)
    current_speaker = None
    for part in parts:
        tag_match = re.match(r'<Speaker\s*(\d+)>\s*:?\s*', part)
        if tag_match:
            current_speaker = f'Speaker {tag_match.group(1)}'
        elif current_speaker and part.strip():
            speaker_texts[current_speaker].append(part.strip())

    if not speaker_texts:
        cleaned = re.sub(r'<[^>]+>', '', transcript).strip()
        if cleaned:
            speaker_texts['Speaker 1'].append(cleaned)

    return dict(speaker_texts)


def _identify_interviewee(speaker_texts: dict[str, list[str]]) -> dict:
    """Identify the interviewee using word count + question ratio heuristics."""
    if len(speaker_texts) == 0:
        return {
            'interviewee_label': None, 'interviewee_text': '',
            'confidence': 0.0, 'needs_review': True,
            'reason': 'No speakers found', 'speaker_stats': {},
        }

    if len(speaker_texts) == 1:
        label = list(speaker_texts.keys())[0]
        text = ' '.join(speaker_texts[label])
        return {
            'interviewee_label': label, 'interviewee_text': text,
            'confidence': 1.0, 'needs_review': False,
            'reason': 'Single speaker — auto-accepted',
            'speaker_stats': {label: {'word_count': len(text.split())}},
        }

    # Multi-speaker
    stats = {}
    for label, segments in speaker_texts.items():
        combined = ' '.join(segments)
        words = combined.split()
        sentences = [s.strip() for s in re.split(r'(?<=[.!?。？！])\s*', combined) if s.strip()]
        n_questions = sum(1 for s in sentences if s.rstrip().endswith(('?', '？')))
        n_sentences = max(len(sentences), 1)

        stats[label] = {
            'word_count': len(words),
            'text': combined,
            'n_turns': len(segments),
            'mean_turn_length': len(words) / max(len(segments), 1),
            'question_ratio': n_questions / n_sentences,
            'n_questions': n_questions,
        }

    total_words = sum(s['word_count'] for s in stats.values())
    dominant = max(stats.keys(), key=lambda k: stats[k]['word_count'])
    dominant_share = stats[dominant]['word_count'] / total_words if total_words > 0 else 0

    # Swap check
    if len(stats) == 2:
        other = [k for k in stats.keys() if k != dominant][0]
        if (stats[dominant]['question_ratio'] > 0.4 and
            stats[other]['question_ratio'] < 0.2 and
            stats[other]['word_count'] / total_words > 0.3):
            dominant = other
            dominant_share = stats[dominant]['word_count'] / total_words

    needs_review = dominant_share < SPEAKER_CONFIDENCE_THRESHOLD

    reason = (
        f'Low confidence: {dominant} has {dominant_share:.0%} of words. Please verify.'
        if needs_review else
        f'{dominant} identified ({dominant_share:.0%} of words, '
        f'{stats[dominant]["n_questions"]} questions)'
    )

    return {
        'interviewee_label': dominant,
        'interviewee_text': stats[dominant]['text'],
        'confidence': dominant_share,
        'needs_review': needs_review,
        'reason': reason,
        'speaker_stats': stats,
    }


def _separate_interviewee_speech(transcript: str) -> dict:
    """Parse speakers and identify the interviewee."""
    speaker_texts = _parse_speakers(transcript)
    return _identify_interviewee(speaker_texts)


# ============================================================
# Text Preprocessing
# ============================================================

def _clean_text(text: str) -> str:
    """Remove residual tags, collapse whitespace."""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def _segment_sentences(doc) -> list[str]:
    """Extract sentence strings from spaCy Doc."""
    return [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 0]


# ============================================================
# Feature Extraction Functions
# ============================================================

def _extract_lexical_features(doc) -> dict:
    """POS-based lexical features (Universal POS — works for EN and ZH)."""
    pos_counts = Counter(t.pos_ for t in doc if not t.is_punct and not t.is_space)
    total = sum(pos_counts.values())

    if total == 0:
        return {k: 0.0 for k in ['pronoun_to_noun_ratio', 'content_word_density',
                                   'noun_ratio', 'verb_ratio', 'pronoun_ratio', 'adjective_ratio']}

    n_nouns = pos_counts.get('NOUN', 0) + pos_counts.get('PROPN', 0)
    n_pronouns = pos_counts.get('PRON', 0)
    n_verbs = pos_counts.get('VERB', 0) + pos_counts.get('AUX', 0)
    n_adj = pos_counts.get('ADJ', 0)
    n_adv = pos_counts.get('ADV', 0)
    content_words = n_nouns + pos_counts.get('VERB', 0) + n_adj + n_adv

    return {
        'pronoun_to_noun_ratio': n_pronouns / n_nouns if n_nouns > 0 else float('inf'),
        'content_word_density': content_words / total,
        'noun_ratio': n_nouns / total,
        'verb_ratio': n_verbs / total,
        'pronoun_ratio': n_pronouns / total,
        'adjective_ratio': n_adj / total,
    }


def _extract_lexical_diversity(text: str, lang: str) -> dict:
    """Length-independent lexical diversity via TAALED."""
    try:
        from taaled import ld

        if lang == 'zh':
            tokens = [ch for ch in text if '\u4e00' <= ch <= '\u9fff']
        else:
            tokens = re.findall(r'[a-zA-Z]+', text.lower())

        if len(tokens) < 50:
            simple_ttr = len(set(tokens)) / len(tokens) if tokens else 0.0
            return {'mattr': simple_ttr, 'mtld': 0.0,
                    'n_unique_words': len(set(tokens)), 'ttr_raw': simple_ttr}

        ldvals = ld.lexdiv(tokens)
        return {
            'mattr': ldvals.mattr,
            'mtld': ldvals.mtld,
            'n_unique_words': len(set(tokens)),
            'ttr_raw': len(set(tokens)) / len(tokens),
        }
    except Exception:
        tokens = list(text) if lang == 'zh' else re.findall(r'[a-zA-Z]+', text.lower())
        simple_ttr = len(set(tokens)) / len(tokens) if tokens else 0.0
        return {'mattr': simple_ttr, 'mtld': 0.0,
                'n_unique_words': len(set(tokens)), 'ttr_raw': simple_ttr}


def _extract_word_frequency_features(doc, lang: str) -> dict:
    """Mean word frequency (Zipf scale) of content words."""
    content_pos = {'NOUN', 'VERB', 'ADJ', 'ADV', 'PROPN'}
    wf_code = LANG_CONFIG[lang]['wordfreq_code']

    freqs = []
    for token in doc:
        if token.pos_ in content_pos and not token.is_stop:
            if lang == 'zh':
                if len(token.text.strip()) > 0:
                    freqs.append(zipf_frequency(token.text, wf_code))
            else:
                if len(token.text) > 2:
                    freqs.append(zipf_frequency(token.lemma_.lower(), wf_code))

    if not freqs:
        return {'mean_word_frequency': 0.0, 'low_freq_word_ratio': 0.0,
                'high_freq_word_ratio': 0.0}

    freqs = np.array(freqs)
    return {
        'mean_word_frequency': float(np.mean(freqs)),
        'low_freq_word_ratio': float(np.mean(freqs < 3.0)),
        'high_freq_word_ratio': float(np.mean(freqs > 5.0)),
    }


def _extract_utterance_features(doc) -> dict:
    """Sentence-level stats: MLU, count, variance."""
    sentences = _segment_sentences(doc)

    if not sentences:
        return {'mlu': 0.0, 'sentence_count': 0, 'sentence_length_std': 0.0,
                'total_word_count': 0}

    sent_lengths = [len(s.split()) for s in sentences]

    return {
        'mlu': float(np.mean(sent_lengths)),
        'sentence_count': len(sentences),
        'sentence_length_std': float(np.std(sent_lengths)) if len(sent_lengths) > 1 else 0.0,
        'total_word_count': sum(sent_lengths),
    }


def _extract_filler_features(text: str, lang: str) -> dict:
    """Filler words and empty speech markers. Language-aware."""
    if lang == 'zh':
        chars = list(text)
        total = len(chars)
        if total == 0:
            return {k: 0.0 for k in ['filler_um_rate', 'filler_uh_rate', 'filler_total_rate',
                                       'um_to_uh_ratio', 'discourse_filler_rate', 'empty_speech_rate']}
        n_um = sum(text.count(f) for f in ZH_FILLERS_UM)
        n_uh = sum(text.count(f) for f in ZH_FILLERS_UH)
        n_disc = sum(text.count(f) for f in ZH_FILLERS_DISCOURSE)
        n_empty = sum(text.count(f) for f in ZH_EMPTY_TERMS)
    else:
        words = text.lower().split()
        total = len(words)
        if total == 0:
            return {k: 0.0 for k in ['filler_um_rate', 'filler_uh_rate', 'filler_total_rate',
                                       'um_to_uh_ratio', 'discourse_filler_rate', 'empty_speech_rate']}
        words_filtered = [w for w in words if w not in SINGLISH_PARTICLES]
        n_um = sum(1 for w in words_filtered if w in FILLERS_UM)
        n_uh = sum(1 for w in words_filtered if w in FILLERS_UH)
        text_lower = text.lower()
        n_disc = sum(text_lower.count(f) for f in FILLERS_DISCOURSE)
        n_empty = sum(1 for w in words_filtered if w in EN_EMPTY_TERMS)
        for bigram in EN_EMPTY_BIGRAMS:
            n_empty += text_lower.count(bigram)

    return {
        'filler_um_rate': n_um / total,
        'filler_uh_rate': n_uh / total,
        'filler_total_rate': (n_um + n_uh) / total,
        'um_to_uh_ratio': n_um / n_uh if n_uh > 0 else (1.0 if n_um > 0 else 0.0),
        'discourse_filler_rate': n_disc / total,
        'empty_speech_rate': n_empty / total,
    }


def _extract_syntactic_features(doc) -> dict:
    """Dependency-based syntactic complexity."""
    dep_distances = []
    n_proposition_bearing = 0
    n_tokens = 0

    for token in doc:
        if token.is_punct or token.is_space:
            continue
        n_tokens += 1
        if token.head != token:
            dep_distances.append(abs(token.i - token.head.i))
        if token.pos_ in {'NOUN', 'VERB', 'ADJ', 'ADV', 'ADP', 'SCONJ', 'CCONJ', 'PROPN'}:
            n_proposition_bearing += 1

    if not dep_distances:
        return {'mean_dependency_distance': 0.0, 'max_dependency_distance': 0,
                'idea_density_proxy': 0.0}

    return {
        'mean_dependency_distance': float(np.mean(dep_distances)),
        'max_dependency_distance': int(np.max(dep_distances)),
        'idea_density_proxy': n_proposition_bearing / n_tokens if n_tokens > 0 else 0.0,
    }


def _extract_coherence_features(sentences: list[str], lang: str) -> dict:
    """Semantic coherence via TF-IDF or sentence-transformers."""
    if len(sentences) < 2:
        return {'semantic_coherence_mean': 1.0, 'semantic_coherence_std': 0.0,
                'semantic_coherence_min': 1.0, 'repetitiveness_score': 0.0,
                'topic_drift': 0.0}

    # Compute embeddings / vectors
    if USE_SENTENCE_TRANSFORMERS and _st_model is not None:
        embeddings = _st_model.encode(sentences, show_progress_bar=False)
        adjacent_sims = [
            float(cosine_similarity(embeddings[i:i+1], embeddings[i+1:i+2])[0, 0])
            for i in range(len(embeddings) - 1)
        ]
        rep_threshold = 0.85
    else:
        if lang == 'zh':
            vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(1, 3), max_features=5000)
        else:
            vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
        try:
            tfidf_matrix = vectorizer.fit_transform(sentences)
        except ValueError:
            return {'semantic_coherence_mean': 0.0, 'semantic_coherence_std': 0.0,
                    'semantic_coherence_min': 0.0, 'repetitiveness_score': 0.0,
                    'topic_drift': 0.0}
        adjacent_sims = [
            float(cosine_similarity(tfidf_matrix[i:i+1], tfidf_matrix[i+1:i+2])[0, 0])
            for i in range(len(sentences) - 1)
        ]
        rep_threshold = 0.5

    sims = np.array(adjacent_sims)
    return {
        'semantic_coherence_mean': float(np.mean(sims)),
        'semantic_coherence_std': float(np.std(sims)) if len(sims) > 1 else 0.0,
        'semantic_coherence_min': float(np.min(sims)),
        'repetitiveness_score': float(np.mean(sims > rep_threshold)),
        'topic_drift': float(np.std(sims)) if len(sims) > 1 else 0.0,
    }


# ============================================================
# Core extraction: str → dict
# ============================================================

def extract_linguistic_features(transcript_text: str) -> tuple[dict, dict, str]:
    """
    Extract all linguistic features from a transcript string.

    This is the core function. The LangGraph node below wraps it
    to read/write AgentState, but this function is also called
    directly during training (from the notebook).

    Args:
        transcript_text: Raw transcript string from MERaLiON,
                         may contain <Speaker N> tags.

    Returns:
        features:     dict of 25 numeric features for the classifier
        speaker_info: dict with speaker separation metadata
        lang:         detected language key ('en' or 'zh')
    """
    # --- Speaker separation ---
    speaker_result = _separate_interviewee_speech(transcript_text)
    text = _clean_text(speaker_result['interviewee_text'])

    speaker_info = {
        'interviewee_label': speaker_result['interviewee_label'],
        'confidence': speaker_result['confidence'],
        'needs_review': speaker_result['needs_review'],
        'reason': speaker_result['reason'],
    }

    if not text or len(text.split()) < 5:
        # Return zeroed features rather than crashing the pipeline
        return _empty_features(), speaker_info, 'en'

    # --- Language detection ---
    lang = _detect_language(text)
    nlp_model = _get_spacy_model(lang)

    if nlp_model is None:
        return _empty_features(), speaker_info, lang

    # --- spaCy processing ---
    doc = nlp_model(text)
    sentences = _segment_sentences(doc)

    # --- Extract all feature groups ---
    features = {}
    features.update(_extract_lexical_features(doc))
    features.update(_extract_lexical_diversity(text, lang))
    features.update(_extract_word_frequency_features(doc, lang))
    features.update(_extract_utterance_features(doc))
    features.update(_extract_filler_features(text, lang))
    features.update(_extract_syntactic_features(doc))
    features.update(_extract_coherence_features(sentences, lang))

    return features, speaker_info, lang


def _empty_features() -> dict:
    """Return zeroed feature dict when text is too short or missing."""
    return {
        'pronoun_to_noun_ratio': 0.0, 'content_word_density': 0.0,
        'noun_ratio': 0.0, 'verb_ratio': 0.0,
        'pronoun_ratio': 0.0, 'adjective_ratio': 0.0,
        'mattr': 0.0, 'mtld': 0.0,
        'n_unique_words': 0, 'ttr_raw': 0.0,
        'mean_word_frequency': 0.0, 'low_freq_word_ratio': 0.0,
        'high_freq_word_ratio': 0.0,
        'mlu': 0.0, 'sentence_count': 0,
        'sentence_length_std': 0.0, 'total_word_count': 0,
        'filler_um_rate': 0.0, 'filler_uh_rate': 0.0,
        'filler_total_rate': 0.0, 'um_to_uh_ratio': 0.0,
        'discourse_filler_rate': 0.0, 'empty_speech_rate': 0.0,
        'mean_dependency_distance': 0.0, 'max_dependency_distance': 0,
        'idea_density_proxy': 0.0,
        'semantic_coherence_mean': 0.0, 'semantic_coherence_std': 0.0,
        'semantic_coherence_min': 0.0, 'repetitiveness_score': 0.0,
        'topic_drift': 0.0,
    }


# ============================================================
# LangGraph Node
# ============================================================

def feature_calc_agent(state: AgentState) -> AgentState:
    """
    LangGraph node: extract linguistic features from transcript.

    Reads:
        state.transcript_text

    Writes:
        state.linguistic_features   (dict — feature vector for classifier)
        state.speaker_info          (dict — speaker separation metadata)
        state.detected_language     (str  — 'en' or 'zh')
        state.messages              (appends log entry)
    """
    transcript = state.transcript_text or ''

    try:
        features, speaker_info, lang = extract_linguistic_features(transcript)

        state.linguistic_features = features
        # state.speaker_info = speaker_info
        # state.detected_language = lang

        # Log
        n_words = features.get('total_word_count', 0)
        review_flag = ' [NEEDS SPEAKER REVIEW]' if speaker_info['needs_review'] else ''
        state.messages.append(
            f"[feature_calc_agent] Extracted {len(features)} features "
            f"({n_words} words, lang={lang}){review_flag}"
        )

    except Exception as e:
        state.linguistic_features = _empty_features()
        # state.speaker_info = {'needs_review': True, 'reason': f'Exception: {e}'}
        # state.detected_language = 'en'
        # state.errors = str(e)
        state.messages.append(f"[feature_calc_agent] Exception: {e}")

    return state
