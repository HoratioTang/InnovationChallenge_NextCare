"""Fusion agent — weighted combination of acoustic and semantic scores.

Organizational agent (deterministic, no LLM).
Reads:  state.acoustic_result, state.semantic_result
Writes: state.fusion_result, state.messages, state.errors

"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from agents.state import AgentState


# --- Fusion Logic Handler ---
class DecisionFusionHandler:
    def __init__(self, w_acoustic: float = 0.3, w_semantic: float = 0.7):
        """
        Initializes the fusion handler with specific branch weights.
        Default: Semantic branch (0.7) has higher weight than Acoustic (0.3).
        """
        self.w_a = w_acoustic
        self.w_s = w_semantic

    def run_fusion_pipeline(self, acoustic_prob: float, semantic_prob: float):
        """Calculates the weighted score and determines final prediction."""
        # Weighted Decision Fusion Formula: 
        # Final Score = (w_acoustic * Acoustic_Prob) + (w_semantic * Semantic_Prob)
        final_score = (self.w_a * acoustic_prob) + (self.w_s * semantic_prob)
        prediction = 1 if final_score >= 0.5 else 0
        
        return {
            "final_score": round(float(final_score), 4),
            "prediction": int(prediction),
            "details": {
                "acoustic_contribution": round(self.w_a * acoustic_prob, 4),
                "semantic_contribution": round(self.w_s * semantic_prob, 4),
                "weights": {"acoustic": self.w_a, "semantic": self.w_s}
            }
        }

    
# --- Fusion Agent (The LangGraph Skill) ---
def fusion_agent(state: AgentState) -> AgentState:
    """
    Decision fusion agent that merges scalar probabilities from different branches.
    Adheres to the LangGraph node pattern: state in -> updated state out.
    """

    # Verify both branches have provided results before proceeding
    if state.acoustic_result is None or state.semantic_result is None:
        state.errors = "Missing classification results from acoustic or semantic branch."
        state.messages.append("[fusion_agent] Error: Incomplete branch data.")
        return state

    # Instantiate handler (Weights can be adjusted here or via environment variables)
    handler = DecisionFusionHandler(w_acoustic=0.3, w_semantic=0.7)

    try:
        # Execute fusion
        results = handler.run_fusion_pipeline(
            acoustic_prob=state.acoustic_result, 
            semantic_prob=state.semantic_result
        )

        # Update state
        state.fusion_result = results
        state.messages.append(
            f"[fusion_agent] Successfully fused results for {state.subject_id}. "
            f"Final Score: {results['final_score']} | Prediction: {results['prediction']}"
        )

    except Exception as e:
        state.errors = str(e)
        state.messages.append(f"[fusion_agent] Exception occurred: {str(e)}")

    return state