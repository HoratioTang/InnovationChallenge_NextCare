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
