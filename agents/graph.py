"""Main LangGraph graph — wires all agents into a parallel two-branch pipeline.

START ─┬→ audio_process → hear_embed → classifier_acoustic ────────┐
       │                                                          ├→ fusion → report (end)
       └→ transcription → feature_calc → classifier_semantic ─────┘

This is the only file that knows execution order.
Agent files do not import each other.
"""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END

from agents.state import AgentState
from agents.audio_process import audio_process_agent
from agents.hear_embed import hear_embed_agent
from agents.classifier_acoustic import classifier_acoustic_agent
from agents.transcription_agent import transcription_agent
from agents.feature_calc import feature_calc_agent
from agents.classifier_semantic import classifier_semantic_agent
from agents.fusion import fusion_agent
from agents.report import report_agent


def build_graph():
    """Construct and compile the dementia-screening LangGraph pipeline."""
    graph = StateGraph(AgentState)

    # ---- Register nodes ----
    graph.add_node("audio_process", audio_process_agent)
    graph.add_node("hear_embed", hear_embed_agent)
    graph.add_node("classifier_acoustic", classifier_acoustic_agent)
    graph.add_node("transcription", transcription_agent)
    graph.add_node("feature_calc", feature_calc_agent)
    graph.add_node("classifier_semantic", classifier_semantic_agent)
    graph.add_node("fusion", fusion_agent)
    graph.add_node("report", report_agent)

    # ---- Fan-out from START: both branches run in parallel ----
    graph.add_edge(START, "audio_process")
    graph.add_edge(START, "transcription")

    # ---- Acoustic branch ----
    graph.add_edge("audio_process", "hear_embed")
    graph.add_edge("hear_embed", "classifier_acoustic")

    # ---- Semantic branch ----
    graph.add_edge("transcription", "feature_calc")
    graph.add_edge("feature_calc", "classifier_semantic")

    # ---- Converge at fusion (waits for both branches) ----
    graph.add_edge("classifier_acoustic", "fusion")
    graph.add_edge("classifier_semantic", "fusion")

    # ---- Fusion → Report → END ----
    graph.add_edge("fusion", "report")
    graph.add_edge("report", END)

    return graph.compile()
