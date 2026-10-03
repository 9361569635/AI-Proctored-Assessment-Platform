export type CodingSession = "EASY_CODING" | "MODERATE_CODING" | "HARD_CODING";
export type CodingDifficulty = "EASY" | "MODERATE" | "HARD";

export interface CodingQuestionListItem {
  id: string;
  session: CodingSession;
  title: string;
  description: string;
  difficulty: CodingDifficulty;
  marks: number;
  visibleTestCases: Array<{ id: string; input: string; expectedOutput: string }>;
  hiddenTestCaseCount: number;
}

export interface CreateCodingQuestionPayload {
  session: CodingSession;
  title: string;
  description: string;
  difficulty: CodingDifficulty;
  marks: number;
  testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
}
