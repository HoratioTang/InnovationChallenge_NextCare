import type { ScreeningResult } from "../types";

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
