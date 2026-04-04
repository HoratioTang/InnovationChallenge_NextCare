"""Dashboard chatbot — subject-scoped conversational Q&A over screening history.

Queries the memory store for subject context, builds a system prompt with
safety constraints, and sends to Gemini for a concise caregiver-friendly reply.
"""

from __future__ import annotations

import os
from typing import Optional

from dotenv import load_dotenv
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from config import (
    CHAT_HISTORY_TURNS,
    CHAT_MAX_OUTPUT_TOKENS,
    CHAT_TRANSCRIPT_WORDS,
    REPORT_LLM_MODEL,
    REPORT_LLM_PROVIDER,
)

# ---------------------------------------------------------------------------
# Module-level singleton (separate from report agent — different token cap)
# ---------------------------------------------------------------------------
_llm = None


def _get_chat_llm():
    global _llm
    if _llm is not None:
        return _llm

    if REPORT_LLM_PROVIDER == "gemini":
        load_dotenv()
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("Missing GEMINI_API_KEY environment variable")
        from langchain_google_genai import ChatGoogleGenerativeAI, HarmCategory, HarmBlockThreshold
        _llm = ChatGoogleGenerativeAI(
            model=REPORT_LLM_MODEL,
            google_api_key=api_key,
            safety_settings={
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
            },
        )
    elif REPORT_LLM_PROVIDER == "ollama":
        from langchain_ollama import ChatOllama
        _llm = ChatOllama(model=REPORT_LLM_MODEL)
    else:
        raise ValueError(f"Unknown REPORT_LLM_PROVIDER: {REPORT_LLM_PROVIDER}")

    return _llm


# ---------------------------------------------------------------------------
# Context builder
# ---------------------------------------------------------------------------

def build_chat_context(memory, subject_id: str) -> Optional[dict]:
    """Assemble subject data for the chat LLM. Returns None if not found."""
    subjects = memory.list_subjects()
    subject = next((s for s in subjects if s["subject_id"] == subject_id), None)
    if not subject:
        return None

    history = memory.get_history(subject_id)
    baselines = memory.get_baselines(subject_id)
    change_flags = memory.get_change_flags(subject_id)
    score_trend = memory.get_score_trend(subject_id)

    # Latest session: features + trimmed transcript
    latest_session = None
    if history:
        latest = history[-1]
        latest_session = memory.get_session(subject_id, latest["session_id"])

    latest_transcript = None
    if latest_session and latest_session.get("transcript"):
        words = latest_session["transcript"].split()
        if len(words) > CHAT_TRANSCRIPT_WORDS:
            latest_transcript = "..." + " ".join(words[-CHAT_TRANSCRIPT_WORDS:])
        else:
            latest_transcript = " ".join(words)

    return {
        "subject_name": subject.get("name", subject_id),
        "session_count": subject.get("session_count", len(history)),
        "last_screened": subject.get("last_screened"),
        "score_trend": score_trend,
        "latest_scores": {
            "fused": latest_session.get("fused_score") if latest_session else None,
            "acoustic": latest_session.get("acoustic_score") if latest_session else None,
            "semantic": latest_session.get("semantic_score") if latest_session else None,
        },
        "change_flags": change_flags,
        "baselines": baselines,
        "latest_features": latest_session.get("linguistic_features") if latest_session else None,
        "latest_transcript": latest_transcript,
    }


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

def build_system_prompt(context: dict) -> str:
    return f"""You are a helpful assistant for a dementia screening system called NextCare. You are currently helping a caregiver understand screening results for subject "{context['subject_name']}".

CRITICAL CONSTRAINTS:
- You are a SCREENING tool, NOT a diagnostic tool. NEVER say someone has or doesn't have dementia.
- NEVER use phrases like "this indicates dementia", "this confirms cognitive decline", or any language that could be interpreted as a medical diagnosis.
- Always frame findings as "screening observations" or "patterns worth discussing with a healthcare professional."
- When discussing concerning trends, always recommend consulting a doctor. Do not alarm the caregiver.
- Be empathetic and culturally sensitive. The caregiver may be a family member who is worried.
- If asked about something outside the screening data, say you can only discuss this subject's screening results.
- If asked to compare to other subjects or population norms, decline — you only have this subject's data.

SUBJECT DATA:
- Sessions completed: {context['session_count']}
- Last screened: {context['last_screened']}
- Score trend (fused, chronological): {context['score_trend']}
- Latest scores: Fused={context['latest_scores']['fused']}, Acoustic={context['latest_scores']['acoustic']}, Semantic={context['latest_scores']['semantic']}

SCORE INTERPRETATION:
- Scores range from 0.0 to 1.0. Lower is better.
- Below 0.3 = low risk (green). 0.3-0.7 = moderate (orange). Above 0.7 = elevated (red).
- "Acoustic score" reflects vocal patterns (speech rhythm, tone, fluency).
- "Semantic score" reflects language content (vocabulary, coherence, complexity).
- "Fused score" is a weighted combination of both.

CHANGE FLAGS (significant deviations from this person's baseline):
{_format_flags(context['change_flags'])}

FEATURE EXPLANATION (use when asked about specific features):
- MATTR / lexical diversity: How varied the person's vocabulary is. Declining diversity may suggest word-finding difficulty.
- Pronoun-to-noun ratio: High ratio may mean the person is substituting pronouns ("it", "that thing") for specific nouns they can't recall.
- Filled pause rate (um/uh): Increased hesitations may suggest greater word retrieval effort.
- Discourse filler rate: Increased use of fillers like "you know", "I mean" to maintain conversational flow.
- Topic drift: How much the conversation wanders from its starting topic.
- Semantic coherence: How logically connected successive sentences are.
- Repetitiveness: How often the same phrases or ideas recur.
- MLU (mean length of utterance): Shorter utterances may indicate syntactic simplification.
- Idea density: Fewer distinct ideas per sentence.

LATEST LINGUISTIC FEATURES:
{_format_features(context['latest_features'])}

BASELINE STATISTICS (personal averages across all sessions):
{_format_baselines(context['baselines'])}

LATEST TRANSCRIPT (last ~{CHAT_TRANSCRIPT_WORDS} words):
{context['latest_transcript'] or "No transcript available."}

RESPONSE GUIDELINES:
- Keep answers concise — 2-4 sentences for simple questions, up to a paragraph for complex ones.
- Use plain language. Avoid jargon unless the caregiver uses it first.
- When comparing to baseline, say "compared to their usual pattern" not "compared to baseline mean."
"""


def _format_flags(flags: list[dict]) -> str:
    if not flags:
        return "No significant changes detected."
    lines = []
    for f in flags:
        lines.append(
            f"- {f['feature']} ({f['group']}): {f['description']}. "
            f"Current={f['current_value']}, Baseline={f['baseline_mean']}, "
            f"z={f['z_score']} [{f['concern_level']}]"
        )
    return "\n".join(lines)


def _format_features(features: Optional[dict]) -> str:
    if not features:
        return "No features available."
    lines = [f"- {k}: {v}" for k, v in features.items() if v is not None]
    return "\n".join(lines) if lines else "No features available."


def _format_baselines(baselines: dict) -> str:
    if not baselines:
        return "No baselines established yet."
    lines = []
    for fname, b in baselines.items():
        lines.append(
            f"- {fname}: mean={b['mean']:.4f}, std={b['std']:.4f}, sessions={b['count']}"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Chat handler
# ---------------------------------------------------------------------------

async def handle_chat(
    memory,
    subject_id: str,
    message: str,
    history: list[dict],
) -> str:
    """Process a chat message and return the LLM response."""
    context = build_chat_context(memory, subject_id)
    if context is None:
        return "I don't have any screening data for this subject yet."

    system_prompt = build_system_prompt(context)

    # Build langchain message list
    messages = [SystemMessage(content=system_prompt)]

    # Add conversation history (capped)
    recent = history[-CHAT_HISTORY_TURNS:]
    for turn in recent:
        if turn.get("role") == "user":
            messages.append(HumanMessage(content=turn["content"]))
        elif turn.get("role") == "assistant":
            messages.append(AIMessage(content=turn["content"]))

    # Add current user message
    messages.append(HumanMessage(content=message))

    llm = _get_chat_llm()
    response = await llm.ainvoke(messages)
    return response.content
