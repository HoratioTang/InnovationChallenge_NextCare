"""Fusion agent — weighted combination of acoustic and semantic scores.

Organizational agent (deterministic, no LLM).
Reads:  state.acoustic_result, state.semantic_result
Writes: state.fusion_result, state.messages

TODO: Implementation pending (teammate's responsibility).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents.state import AgentState


def fusion_agent(state: AgentState) -> AgentState:
    """LangGraph node: fuse acoustic and semantic scores."""
    raise NotImplementedError("fusion_agent not yet implemented")
