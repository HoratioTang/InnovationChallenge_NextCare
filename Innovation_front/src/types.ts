export interface ScreeningResult {
  acoustic_result: number | null;
  semantic_result: number | null;
  fusion_result: number | null;
  report: string | null;
  messages: string[];
  errors: string[];
  transcript_text: string;
  meralion_acoustic_analysis: string;
  meralion_cognitive_insights: string;
  linguistic_features: Record<string, unknown> | null;
}
