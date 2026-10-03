import { apiFetch } from "./apiClient";
import type { CodingQuestionListItem, CreateCodingQuestionPayload } from "../types/codingQuestion";

export const listCodingQuestions = () => apiFetch<{ codingQuestions: CodingQuestionListItem[] }>("/coding/questions");

export const createCodingQuestion = (payload: CreateCodingQuestionPayload) =>
  apiFetch<{ codingQuestion: { id: string } }>("/coding/questions", { method: "POST", body: payload });
