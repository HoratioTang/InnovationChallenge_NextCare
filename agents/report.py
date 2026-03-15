"""Report agent — generates a caregiver-facing screening report using an LLM.

LLM-driven agent.
Reads:  state.acoustic_result, state.semantic_result, state.fusion_result,
        state.transcript_text, state.meralion_acoustic_analysis,
        state.meralion_cognitive_insights, state.linguistic_features,
        state.report_language, state.file_name
Writes: state.report, state.messages, state.errors
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

from dotenv import load_dotenv
from langchain_core.messages import SystemMessage, HumanMessage

from config import REPORT_LLM_PROVIDER, REPORT_LLM_MODEL
from agents.skill_store import load_skill

if TYPE_CHECKING:
    from agents.state import AgentState

# ---------------------------------------------------------------------------
# Module-level singleton for the LLM
# ---------------------------------------------------------------------------
_llm = None


def _get_llm():
    """Load the LLM based on config toggle. Cached at module level."""
    global _llm
    if _llm is not None:
        return _llm

    if REPORT_LLM_PROVIDER == "gemini":
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Missing GEMINI_API_KEY environment variable")
        from langchain_google_genai import ChatGoogleGenerativeAI
        _llm = ChatGoogleGenerativeAI(
            model=REPORT_LLM_MODEL,
            google_api_key=api_key,
        )
    elif REPORT_LLM_PROVIDER == "ollama":
        from langchain_ollama import ChatOllama
        _llm = ChatOllama(model=REPORT_LLM_MODEL)
    else:
        raise ValueError(f"Unknown REPORT_LLM_PROVIDER: {REPORT_LLM_PROVIDER}")

    return _llm


def _load_system_prompt() -> str:
    """Load the system prompt from the skill file via skill_store."""
    return load_skill("report").prompt


def _build_user_message(state: AgentState) -> str:
    """Assemble all state data into a structured prompt for the LLM."""

    def _score_str(value, name):
        if value is None:
            return f"  {name}: DATA UNAVAILABLE (upstream pipeline did not produce this score)"
        return f"  {name}: {value:.4f}"

    def _linguistic_summary(features):
        if features is None:
            return "  Linguistic features: DATA UNAVAILABLE"
        highlight_keys = [
            'pronoun_to_noun_ratio', 'content_word_density',
            'mattr', 'mtld', 'mean_word_frequency',
            'mlu', 'sentence_count', 'filler_total_rate',
            'um_to_uh_ratio', 'empty_speech_rate',
            'mean_dependency_distance', 'idea_density_proxy',
            'semantic_coherence_mean', 'repetitiveness_score', 'topic_drift',
        ]
        lines = []
        for key in highlight_keys:
            if key in features:
                val = features[key]
                lines.append(f"    {key}: {val}")
        return "  Key linguistic features:\n" + "\n".join(lines)

    sections = [
        f"Report language: {state.report_language}",
        f"Audio file: {state.file_name}",
        "",
        "=== QUANTITATIVE SCORES ===",
        _score_str(state.acoustic_result, "Vocal Frailty Score (Prob A)"),
        _score_str(state.semantic_result, "Cognitive Footprint Score (Prob B)"),
        _score_str(state.fusion_result, "Combined Screening Score"),
        "",
        "=== TRANSCRIPT ===",
        state.transcript_text if state.transcript_text else "(no transcript available)",
        "",
        "=== ACOUSTIC ANALYSIS ===",
        state.meralion_acoustic_analysis if state.meralion_acoustic_analysis else "(no acoustic analysis available)",
        "",
        "=== COGNITIVE INSIGHTS FROM SPEECH ANALYSIS ===",
        state.meralion_cognitive_insights if state.meralion_cognitive_insights else "(no cognitive insights available)",
        "",
        "=== LINGUISTIC FEATURES ===",
        _linguistic_summary(state.linguistic_features),
    ]

    return "\n".join(sections)


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------
def report_agent(state: AgentState) -> AgentState:
    """LangGraph node: generate a caregiver-facing screening report."""
    try:
        llm = _get_llm()
        system_prompt = _load_system_prompt()
        user_message = _build_user_message(state)

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ])

        state.report = response.content
        state.messages.append(
            f"[report_agent] Report generated ({len(response.content)} chars, "
            f"lang={state.report_language}, provider={REPORT_LLM_PROVIDER})"
        )

    except Exception as e:
        state.errors.append(f"[report_agent] {e}")
        state.messages.append(f"[report_agent] Failed: {e}")

    return state
