"""
Local file-based memory store.
Implements the MemoryStore protocol from app/memory_base.py.

IMPORTANT: This is the local dev / demo backend. If a second backend is
added (e.g. Supabase), it MUST return identical response shapes as defined
in the MemoryStore protocol. If you change a return shape here, update the
other backend too.

Data lives in a single JSON file. Loaded into memory on startup,
flushed to disk on every write. No external dependencies.
"""

import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config import (
    FEATURE_GROUPS,
    HIGHER_IS_WORSE,
    LOWER_IS_WORSE,
    MIN_SESSIONS_FOR_DETECTION,
    Z_THRESHOLD,
)


class LocalMemoryStore:
    """
    In-memory dict backed by a JSON file.

    Internal storage structure (NOT the API contract — internal only):
    {
        "subjects": {
            "<subject_id>": {
                "name": str,
                "sessions": [ ... ],
                "baselines": { "<feature_name>": {mean, std, count, last_value}, ... }
            }
        }
    }

    The PUBLIC interface (method signatures + return shapes) is defined in
    app/memory_base.py and must be kept in sync with any other backend.
    """

    def __init__(self, filepath: str = "screening_history.json"):
        self.filepath = Path(filepath)
        self.data = self._load()

    # ── Persistence (internal) ────────────────────────────

    def _load(self) -> dict:
        if self.filepath.exists():
            with open(self.filepath, "r") as f:
                return json.load(f)
        return {"subjects": {}}

    def _save(self):
        with open(self.filepath, "w") as f:
            json.dump(self.data, f, indent=2, default=str)

    # ── Write Operations ──────────────────────────────────

    def save_session(
        self,
        subject_id: str,
        pipeline_result: dict,
        audio_metadata: Optional[dict] = None,
        user_id: Optional[str] = None,      # Ignored — no auth in local mode
    ) -> str:
        """
        Persist a completed screening result. Returns session_id.

        Return: str (UUID)
        Contract: see memory_base.py
        """
        if subject_id not in self.data["subjects"]:
            self.data["subjects"][subject_id] = {
                "name": subject_id,
                "sessions": [],
                "baselines": {},
            }

        subject = self.data["subjects"][subject_id]

        # Clean features (replace NaN/Inf with None)
        raw_features = pipeline_result.get("linguistic_features") or {}
        clean_features = {}
        for k, v in raw_features.items():
            if v is not None and isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean_features[k] = None
            else:
                clean_features[k] = v

        session_id = str(uuid.uuid4())
        session = {
            "session_id": session_id,
            "acoustic_score": pipeline_result.get("acoustic_result"),
            "semantic_score": pipeline_result.get("semantic_result"),
            "fused_score": pipeline_result.get("fusion_result"),
            "linguistic_features": clean_features,
            "detected_language": (
                pipeline_result.get("detected_language")
                or (audio_metadata or {}).get("language")
            ),
            "transcript": pipeline_result.get("transcript_text"),
            "report_markdown": pipeline_result.get("report"),
            "meralion_acoustic_analysis": pipeline_result.get("meralion_acoustic_analysis"),
            "meralion_cognitive_insights": pipeline_result.get("meralion_cognitive_insights"),
            "audio_duration_sec": (audio_metadata or {}).get("duration_sec"),
            "chunk_count": (audio_metadata or {}).get("chunk_count"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        subject["sessions"].append(session)
        self._update_baselines(subject, clean_features)
        self._save()
        return session_id

    def _update_baselines(self, subject: dict, features: dict):
        """Welford's online algorithm for incremental mean/std."""
        baselines = subject["baselines"]

        for fname, value in features.items():
            if value is None:
                continue

            if fname in baselines:
                b = baselines[fname]
                n = b["count"] + 1
                old_mean = b["mean"]
                old_std = b["std"]

                new_mean = old_mean + (value - old_mean) / n
                if n > 1:
                    new_std = math.sqrt(
                        ((n - 2) / (n - 1)) * (old_std ** 2)
                        + ((value - old_mean) ** 2) / n
                    )
                else:
                    new_std = 0.0

                baselines[fname] = {
                    "mean": new_mean,
                    "std": new_std,
                    "count": n,
                    "last_value": value,
                }
            else:
                baselines[fname] = {
                    "mean": value,
                    "std": 0.0,
                    "count": 1,
                    "last_value": value,
                }

    # ── Read Operations ───────────────────────────────────
    # Return shapes MUST match the contracts in memory_base.py

    def get_history(self, subject_id: str) -> list[dict]:
        """
        Return: list of {session_id, acoustic_score, semantic_score,
                         fused_score, detected_language, created_at}
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject:
            return []

        return [
            {
                "session_id": s["session_id"],
                "acoustic_score": s["acoustic_score"],
                "semantic_score": s["semantic_score"],
                "fused_score": s["fused_score"],
                "detected_language": s["detected_language"],
                "created_at": s["created_at"],
            }
            for s in subject["sessions"]
        ]

    def get_session(self, subject_id: str, session_id: str) -> Optional[dict]:
        """
        Return: full session dict or None.
        Keys: session_id, acoustic_score, semantic_score, fused_score,
              linguistic_features, detected_language, transcript,
              report_markdown, meralion_acoustic_analysis,
              meralion_cognitive_insights, created_at
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject:
            return None
        for s in subject["sessions"]:
            if s["session_id"] == session_id:
                return s
        return None

    def get_feature_trends(
        self, subject_id: str, feature_names: list[str]
    ) -> list[dict]:
        """
        Return: list of {created_at, feature_name, feature_value}
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject:
            return []

        results = []
        for session in subject["sessions"]:
            features = session.get("linguistic_features", {})
            for fname in feature_names:
                if fname in features:
                    results.append({
                        "created_at": session["created_at"],
                        "feature_name": fname,
                        "feature_value": features[fname],
                    })
        return results

    def get_baselines(self, subject_id: str) -> dict:
        """
        Return: {feature_name: {mean, std, count, last_value}, ...}
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject:
            return {}
        return subject["baselines"]

    def get_score_trend(self, subject_id: str) -> list[float]:
        """
        Return: [float, ...] — chronological fused scores, None values excluded.
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject:
            return []
        return [
            s["fused_score"]
            for s in subject["sessions"]
            if s["fused_score"] is not None
        ]

    # ── Change Detection ──────────────────────────────────

    def get_change_flags(
        self, subject_id: str, features: Optional[dict] = None
    ) -> list[dict]:
        """
        Return: list of {feature, group, direction, concern_level,
                         z_score, current_value, baseline_mean, description}
        Sorted by |z_score| descending.
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject or not subject["sessions"]:
            return []

        baselines = subject["baselines"]

        if features is None:
            features = subject["sessions"][-1].get("linguistic_features", {})

        flags = []
        for fname, b in baselines.items():
            if b["count"] < MIN_SESSIONS_FOR_DETECTION:
                continue
            if b["std"] == 0:
                continue

            value = features.get(fname)
            if value is None:
                continue

            z = (value - b["mean"]) / b["std"]

            concerning = False
            direction = "increasing" if z > 0 else "decreasing"

            if fname in HIGHER_IS_WORSE and z > Z_THRESHOLD:
                concerning = True
            elif fname in LOWER_IS_WORSE and z < -Z_THRESHOLD:
                concerning = True

            if concerning:
                flags.append({
                    "feature": fname,
                    "group": self._get_group(fname),
                    "direction": direction,
                    "concern_level": "significant" if abs(z) > 2.0 else "moderate",
                    "z_score": round(z, 2),
                    "current_value": round(value, 4),
                    "baseline_mean": round(b["mean"], 4),
                    "description": self._describe(fname, direction),
                })

        flags.sort(key=lambda f: abs(f["z_score"]), reverse=True)
        return flags

    # ── Context Builder (for future Report Agent integration) ─

    def build_longitudinal_context(self, subject_id: str) -> Optional[dict]:
        """
        Return: {session_count, first_session, latest_session,
                 score_trend, change_flags, previous_report_summary}
        Returns None if fewer than 2 sessions.
        """
        subject = self.data["subjects"].get(subject_id)
        if not subject or len(subject["sessions"]) < 2:
            return None

        sessions = subject["sessions"]
        flags = self.get_change_flags(subject_id)

        prev_report = None
        if len(sessions) >= 2:
            prev_report = sessions[-2].get("report_markdown")

        return {
            "session_count": len(sessions),
            "first_session": sessions[0]["created_at"],
            "latest_session": sessions[-1]["created_at"],
            "score_trend": self.get_score_trend(subject_id),
            "change_flags": flags,
            "previous_report_summary": (
                prev_report[:500] + "..." if prev_report and len(prev_report) > 500
                else prev_report
            ),
        }

    # ── Utilities ─────────────────────────────────────────

    def list_subjects(self) -> list[dict]:
        """
        Return: list of {subject_id, name, session_count, last_screened}
        """
        return [
            {
                "subject_id": sid,
                "name": s["name"],
                "session_count": len(s["sessions"]),
                "last_screened": s["sessions"][-1]["created_at"] if s["sessions"] else None,
            }
            for sid, s in self.data["subjects"].items()
        ]

    def delete_subject(self, subject_id: str) -> None:
        self.data["subjects"].pop(subject_id, None)
        self._save()

    def reset(self):
        """Clear all data. For testing only."""
        self.data = {"subjects": {}}
        self._save()

    @staticmethod
    def _get_group(feature_name: str) -> str:
        for group, names in FEATURE_GROUPS.items():
            if feature_name in names:
                return group
        return "unknown"

    @staticmethod
    def _describe(fname: str, direction: str) -> str:
        descriptions = {
            "mattr": f"Vocabulary diversity has {direction}d",
            "pronoun_to_noun_ratio": f"Pronoun-to-noun ratio is {direction}",
            "filled_pause_rate": f"Filled pauses have {direction}d",
            "discourse_filler_rate": f"Discourse fillers have {direction}d",
            "topic_drift": f"Topic coherence has shifted",
            "semantic_coherence_mean": f"Semantic coherence has {direction}d",
            "repetitiveness": f"Repetitive language has {direction}d",
            "mlu": f"Average utterance length has {direction}d",
            "idea_density_proxy": f"Idea density has {direction}d",
        }
        return descriptions.get(fname, f"{fname} has {direction}d from baseline")
