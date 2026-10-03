import { apiFetch } from "./apiClient";
import type { MyResume, ParsedResume, MatchResult } from "../types/resume";

export const uploadResume = (file: File) => {
  const formData = new FormData();
  formData.append("resume", file);
  return apiFetch<{ resume: { id: string; uploadedAt: string; hasExtractedText: boolean } }>("/resume/upload", {
    method: "POST",
    body: formData,
  });
};

export const analyzeResume = () =>
  apiFetch<{ resumeId: string; parsedData: ParsedResume; matchResult: MatchResult | null }>("/resume/analyze", {
    method: "POST",
  });

export const getMyResume = () => apiFetch<{ resume: MyResume }>("/resume/me");
