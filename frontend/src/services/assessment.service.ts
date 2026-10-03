import { apiFetch } from "./apiClient";
import type { AssessmentStatusResponse, CurrentSessionResponse, AssessmentResultResponse } from "../types/assessment";

export const startAssessment = () => apiFetch<AssessmentStatusResponse>("/assessment/start", { method: "POST" });

export const getStatus = () => apiFetch<AssessmentStatusResponse>("/assessment/status");

export const getCurrentSession = () => apiFetch<CurrentSessionResponse>("/assessment/session/current");

export const submitAnswer = (sessionId: string, questionId: string, answer: string) =>
  apiFetch<{ saved: boolean }>(`/assessment/session/${sessionId}/answer`, {
    method: "POST",
    body: { questionId, answer },
  });

export const completeSession = (sessionId: string) =>
  apiFetch<AssessmentStatusResponse>(`/assessment/session/${sessionId}/complete`, { method: "POST" });

export const getResult = () => apiFetch<AssessmentResultResponse>("/assessment/result");
