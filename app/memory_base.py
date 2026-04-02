"""
Shared interface for the memory system.
Both LocalMemoryStore and any future backend (e.g. Supabase) MUST implement
this protocol. All return types defined here are the contract — do not deviate.
"""

from typing import Optional, Protocol, runtime_checkable


@runtime_checkable
class MemoryStore(Protocol):

    def save_session(
        self,
        subject_id: str,
        pipeline_result: dict,
        audio_metadata: Optional[dict] = None,
        user_id: Optional[str] = None,
    ) -> str:
        """Persist a completed screening result. Returns session_id."""
        ...

    def get_history(self, subject_id: str) -> list[dict]:
        """Get all sessions for a subject, chronologically."""
        ...

    def get_session(self, subject_id: str, session_id: str) -> Optional[dict]:
        """Get full details for a specific session."""
        ...

    def get_feature_trends(
        self, subject_id: str, feature_names: list[str]
    ) -> list[dict]:
        """Get time-series data for specific features."""
        ...

    def get_baselines(self, subject_id: str) -> dict:
        """Get current baseline statistics for all features."""
        ...

    def get_score_trend(self, subject_id: str) -> list[float]:
        """Get chronological list of fused scores."""
        ...

    def get_change_flags(
        self, subject_id: str, features: Optional[dict] = None
    ) -> list[dict]:
        """Compare features against subject's baseline. Returns change flags."""
        ...

    def build_longitudinal_context(self, subject_id: str) -> Optional[dict]:
        """Build structured context dict for the report agent."""
        ...

    def list_subjects(self) -> list[dict]:
        """List all subjects with session counts."""
        ...

    def delete_subject(self, subject_id: str) -> None:
        """Remove a subject and all their data."""
        ...
