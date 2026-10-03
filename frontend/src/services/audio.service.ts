import { apiFetch } from "./apiClient";
import type { AudioSubmitResponse } from "../types/assessment";

export const submitAudioResponse = (sessionId: string, questionId: string, blob: Blob) => {
  const formData = new FormData();
  formData.append("audio", blob, "response.webm");
  return apiFetch<AudioSubmitResponse>(`/audio/session/${sessionId}/question/${questionId}/submit`, {
    method: "POST",
    body: formData,
  });
};
