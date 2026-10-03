import { apiFetch } from "./apiClient";
import type { RunOrSubmitResponse, CodingLanguage } from "../types/assessment";

interface CodePayload {
  codingQuestionId: string;
  language: CodingLanguage;
  sourceCode: string;
}

export const submitCode = (sessionId: string, payload: CodePayload) =>
  apiFetch<RunOrSubmitResponse>(`/coding/session/${sessionId}/submit`, { method: "POST", body: payload });

export const runCode = (sessionId: string, payload: CodePayload) =>
  apiFetch<RunOrSubmitResponse>(`/coding/session/${sessionId}/run`, { method: "POST", body: payload });

export const saveDraft = (sessionId: string, codingQuestionId: string, language: CodingLanguage, sourceCode: string) =>
  apiFetch<void>(`/coding/session/${sessionId}/questions/${codingQuestionId}/draft`, {
    method: "PUT",
    body: { language, sourceCode },
  });

export const getDrafts = (sessionId: string, codingQuestionId: string) =>
  apiFetch<{ drafts: Partial<Record<CodingLanguage, string>> }>(
    `/coding/session/${sessionId}/questions/${codingQuestionId}/draft`
  );