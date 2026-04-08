"""Care plan: feature-group → activity mapping for the Profile page.

Pure module — no FastAPI or memory imports. The endpoint in `app/api.py`
calls `build_care_plan()` with flags + session count from the memory store
and returns the result directly.

The 7 group keys here MUST match `FEATURE_GROUPS` in `config.py` exactly.
"""

from typing import Any

from config import MIN_SESSIONS_FOR_DETECTION


# Feature group → cognitive domain → activities.
# Activities are deterministic suggestions; no LLM involved.
FEATURE_ACTIVITY_MAP: dict[str, dict[str, Any]] = {
    "diversity": {
        "domain": "Vocabulary & Word Finding",
        "description": "Activities that encourage using varied and specific words",
        "activities": [
            {
                "name": "Story Time",
                "description": (
                    "Ask them to describe a favourite childhood memory in as much "
                    "detail as possible. Encourage specific names, places, and "
                    "descriptions rather than general terms."
                ),
                "difficulty": "easy",
                "duration": "10-15 min",
                "frequency": "daily",
            },
            {
                "name": "Word Categories",
                "description": (
                    "Pick a category (fruits, animals, countries) and take turns "
                    "naming items. Start with easy categories and gradually "
                    "increase difficulty."
                ),
                "difficulty": "easy",
                "duration": "5-10 min",
                "frequency": "daily",
            },
            {
                "name": "Describe the Photo",
                "description": (
                    "Show a family photo and ask them to describe everything they "
                    "see — people, setting, colours, what might be happening. "
                    "Encourage specificity over generality."
                ),
                "difficulty": "easy",
                "duration": "10 min",
                "frequency": "3x per week",
            },
            {
                "name": "Reading Aloud",
                "description": (
                    "Read a newspaper article or short story aloud together. "
                    "Pause to discuss unfamiliar or interesting words."
                ),
                "difficulty": "moderate",
                "duration": "15-20 min",
                "frequency": "3x per week",
            },
        ],
    },
    "coherence": {
        "domain": "Conversation Focus & Coherence",
        "description": "Activities that practise staying on topic and connecting ideas logically",
        "activities": [
            {
                "name": "Guided Conversation",
                "description": (
                    "Choose a specific topic (e.g., 'tell me about your wedding "
                    "day') and gently guide them back if the conversation drifts. "
                    "The goal is extended, focused narrative — not correction."
                ),
                "difficulty": "easy",
                "duration": "15 min",
                "frequency": "daily",
            },
            {
                "name": "Recipe Walkthrough",
                "description": (
                    "Ask them to explain how to cook a familiar dish, step by "
                    "step. This exercises sequential thinking and logical ordering."
                ),
                "difficulty": "easy",
                "duration": "10 min",
                "frequency": "2x per week",
            },
            {
                "name": "News Discussion",
                "description": (
                    "Watch or read a short news segment together, then ask them "
                    "to summarize the main points. Focus on 'what happened, why, "
                    "and what might happen next.'"
                ),
                "difficulty": "moderate",
                "duration": "15-20 min",
                "frequency": "3x per week",
            },
        ],
    },
    "filler": {
        "domain": "Speech Fluency & Confidence",
        "description": "Activities that reduce speaking anxiety and build verbal confidence",
        "activities": [
            {
                "name": "Slow Conversation",
                "description": (
                    "Have an unhurried conversation where pausing is encouraged. "
                    "Let them know there's no rush — silence is fine. This reduces "
                    "the pressure that causes filler words."
                ),
                "difficulty": "easy",
                "duration": "10-15 min",
                "frequency": "daily",
            },
            {
                "name": "Familiar Song Singing",
                "description": (
                    "Sing familiar songs or hymns together. Singing uses different "
                    "neural pathways than speech and can improve verbal fluency."
                ),
                "difficulty": "easy",
                "duration": "10 min",
                "frequency": "3x per week",
            },
            {
                "name": "Picture Naming",
                "description": (
                    "Show pictures of common objects and ask them to name each "
                    "one. Start with very familiar items and gradually include "
                    "less common ones. No time pressure."
                ),
                "difficulty": "easy",
                "duration": "5-10 min",
                "frequency": "daily",
            },
        ],
    },
    "syntactic": {
        "domain": "Sentence Complexity & Expression",
        "description": "Activities that encourage fuller, more detailed sentences",
        "activities": [
            {
                "name": "Expand the Sentence",
                "description": (
                    "Start with a simple sentence like 'The cat sat.' Ask them to "
                    "add details: Where? When? What colour? What was it doing? "
                    "Build up to longer, richer descriptions."
                ),
                "difficulty": "moderate",
                "duration": "10 min",
                "frequency": "3x per week",
            },
            {
                "name": "Letter Writing",
                "description": (
                    "Help them write a short letter or message to a friend or "
                    "family member. The process of composing complete sentences "
                    "exercises syntactic planning."
                ),
                "difficulty": "moderate",
                "duration": "15-20 min",
                "frequency": "weekly",
            },
            {
                "name": "Explain How",
                "description": (
                    "Ask them to explain how something works — a household "
                    "appliance, a game they know, their former job. 'How' "
                    "explanations require complex sentence structures."
                ),
                "difficulty": "moderate",
                "duration": "10-15 min",
                "frequency": "2x per week",
            },
        ],
    },
    "lexical": {
        "domain": "Word Specificity & Recall",
        "description": "Activities that practise retrieving specific words rather than using vague substitutes",
        "activities": [
            {
                "name": "Name That Thing",
                "description": (
                    "During daily activities, gently encourage using specific "
                    "nouns instead of 'that thing' or 'it'. Point to objects "
                    "around the house and name them together."
                ),
                "difficulty": "easy",
                "duration": "throughout the day",
                "frequency": "daily",
            },
            {
                "name": "What's Different?",
                "description": (
                    "Show two similar pictures and ask them to describe the "
                    "differences using specific words. This exercises precise "
                    "noun and adjective retrieval."
                ),
                "difficulty": "moderate",
                "duration": "10 min",
                "frequency": "3x per week",
            },
        ],
    },
    "utterance": {
        "domain": "Extended Speaking",
        "description": "Activities that encourage longer, more sustained speech",
        "activities": [
            {
                "name": "Daily Debrief",
                "description": (
                    "At the end of each day, ask them to tell you about their day "
                    "in detail. Encourage them to elaborate — 'what else "
                    "happened?' 'tell me more about that.'"
                ),
                "difficulty": "easy",
                "duration": "10-15 min",
                "frequency": "daily",
            },
            {
                "name": "Life Story Recording",
                "description": (
                    "Record them telling stories from their life — childhood, "
                    "career, travels. This has the added benefit of creating a "
                    "meaningful family archive."
                ),
                "difficulty": "easy",
                "duration": "15-30 min",
                "frequency": "weekly",
            },
        ],
    },
    "frequency": {
        "domain": "Vocabulary Richness",
        "description": "Activities that expose and reinforce less common, more sophisticated words",
        "activities": [
            {
                "name": "Word of the Day",
                "description": (
                    "Introduce one interesting or less common word each day. Use "
                    "it in conversation together. Review previous days' words "
                    "periodically."
                ),
                "difficulty": "easy",
                "duration": "5 min",
                "frequency": "daily",
            },
            {
                "name": "Crossword Puzzles",
                "description": (
                    "Work on crossword puzzles together. These naturally exercise "
                    "vocabulary retrieval and expose less frequent words."
                ),
                "difficulty": "moderate",
                "duration": "15-20 min",
                "frequency": "3x per week",
            },
        ],
    },
}


def build_care_plan(flags: list[dict], session_count: int) -> dict:
    """Build a care plan response from change flags and session count.

    Pure function — no I/O. Buckets each feature group into either `priority`
    (group has at least one active change flag) or `general`. Adds the flag's
    `description` as the `reason` on priority entries.

    Returns a dict with:
        - session_count: int
        - has_enough_data: bool (>= MIN_SESSIONS_FOR_DETECTION)
        - is_stable: bool (enough data AND no flagged groups)
        - priority: list of group dicts with `reason` populated
        - general: list of group dicts (no `reason`)
    """
    flagged_groups: set[str] = set()
    flag_reasons: dict[str, str] = {}
    for flag in flags:
        group = flag.get("group")
        if not group:
            continue
        flagged_groups.add(group)
        # Keep the first flag's description per group (flags are sorted by
        # |z_score| descending in memory_local, so this is the strongest signal)
        if group not in flag_reasons:
            flag_reasons[group] = flag.get("description", "")

    priority_activities: list[dict] = []
    general_activities: list[dict] = []

    for group_key, group_data in FEATURE_ACTIVITY_MAP.items():
        entry = {
            "group": group_key,
            "domain": group_data["domain"],
            "description": group_data["description"],
            "activities": group_data["activities"],
        }
        if group_key in flagged_groups:
            entry["reason"] = flag_reasons[group_key]
            priority_activities.append(entry)
        else:
            general_activities.append(entry)

    has_enough_data = session_count >= MIN_SESSIONS_FOR_DETECTION
    return {
        "session_count": session_count,
        "has_enough_data": has_enough_data,
        "is_stable": has_enough_data and not flagged_groups,
        "priority": priority_activities,
        "general": general_activities,
    }
