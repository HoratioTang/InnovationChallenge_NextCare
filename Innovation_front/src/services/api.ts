import type {
  ScreeningResult,
  SubjectSummary,
  SessionSummary,
  SessionDetail,
  ChangeSummary,
  BaselineStats,
  FeatureTrendPoint,
  ChatMessage,
} from "../types";

const API_BASE = "http://localhost:8000";

export async function runScreening(
  audioFile: File,
  subjectId: string = "anonymous",
  reportLanguage: string = "en",
): Promise<ScreeningResult> {
  const formData = new FormData();
  formData.append("audio", audioFile);
  formData.append("subject_id", subjectId);
  formData.append("report_language", reportLanguage);

  const res = await fetch(`${API_BASE}/api/screen`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(300_000), // 5 min timeout
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Screening failed");
  }

  return res.json();
}

export async function exportPdf(
  results: ScreeningResult,
  subjectId: string = "anonymous",
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/report/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      acoustic_result: results.acoustic_result,
      semantic_result: results.semantic_result,
      fusion_result: results.fusion_result,
      report: results.report,
      subject_id: subjectId,
    }),
  });

  if (!res.ok) {
    throw new Error("PDF export failed");
  }

  return res.blob();
}

// ── Memory / Longitudinal Tracking ──

export async function fetchSubjects(): Promise<SubjectSummary[]> {
  const res = await fetch(`${API_BASE}/api/subjects`);
  if (!res.ok) throw new Error("Failed to fetch subjects");
  return res.json();
}

export async function fetchHistory(subjectId: string): Promise<SessionSummary[]> {
  const res = await fetch(`${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}/history`);
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

export async function fetchSession(subjectId: string, sessionId: string): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
}

export async function fetchChangeSummary(subjectId: string): Promise<ChangeSummary> {
  const res = await fetch(`${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}/change-summary`);
  if (!res.ok) throw new Error("Failed to fetch change summary");
  return res.json();
}

export async function fetchBaselines(subjectId: string): Promise<Record<string, BaselineStats>> {
  const res = await fetch(`${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}/baselines`);
  if (!res.ok) throw new Error("Failed to fetch baselines");
  return res.json();
}

export async function fetchFeatureTrends(subjectId: string, features: string[]): Promise<FeatureTrendPoint[]> {
  const params = new URLSearchParams({ features: features.join(",") });
  const res = await fetch(`${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}/feature-trends?${params}`);
  if (!res.ok) throw new Error("Failed to fetch feature trends");
  return res.json();
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete subject");
}

// ── Dashboard Chatbot ──

export async function sendChatMessage(
  subjectId: string,
  message: string,
  history: ChatMessage[],
): Promise<string> {
  const res = await fetch(
    `${API_BASE}/api/subjects/${encodeURIComponent(subjectId)}/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: history.slice(-10) }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Chat request failed");
  }
  const data = await res.json();
  return data.reply;
}
