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
  session_id: string | null;
  change_flags: ChangeFlag[];
}

// ── Memory / Longitudinal Tracking Types ──

export interface SubjectSummary {
  subject_id: string;
  name: string;
  session_count: number;
  last_screened: string | null;
}

export interface SessionSummary {
  session_id: string;
  acoustic_score: number | null;
  semantic_score: number | null;
  fused_score: number | null;
  detected_language: string | null;
  created_at: string;
}

export interface SessionDetail extends SessionSummary {
  linguistic_features: Record<string, number | null>;
  transcript: string | null;
  report_markdown: string | null;
  meralion_acoustic_analysis: string | null;
  meralion_cognitive_insights: string | null;
  audio_duration_sec: number | null;
  chunk_count: number | null;
}

export interface ChangeFlag {
  feature: string;
  group: string;
  direction: "increasing" | "decreasing";
  concern_level: "moderate" | "significant";
  z_score: number;
  current_value: number;
  baseline_mean: number;
  description: string;
}

export interface ChangeSummary {
  subject_id: string;
  flags: ChangeFlag[];
}

export interface FeatureTrendPoint {
  created_at: string;
  feature_name: string;
  feature_value: number | null;
}

export interface BaselineStats {
  mean: number;
  std: number;
  count: number;
  last_value: number;
}

// ── Care Plan (Profile page) ──

export interface CareActivity {
  name: string;
  description: string;
  difficulty: 'easy' | 'moderate';
  duration: string;
  frequency: string;
}

export interface CareGroup {
  group: string;
  domain: string;
  description: string;
  activities: CareActivity[];
  reason?: string; // only present on priority entries
}

export interface CarePlan {
  session_count: number;
  has_enough_data: boolean;
  is_stable: boolean;
  priority: CareGroup[];
  general: CareGroup[];
}

// ── Dashboard Chatbot ──

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
