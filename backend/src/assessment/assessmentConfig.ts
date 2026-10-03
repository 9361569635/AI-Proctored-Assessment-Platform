import type { SessionType } from "@prisma/client";

export type QuestionFormat = "MCQ" | "LISTEN_REPEAT" | "CODING";

export interface SessionConfig {
  sessionNumber: number;
  sessionType: SessionType;
  format: QuestionFormat;
  totalMarks: number;
  questionCount: number;
  marksPerQuestion: number;
  durationSeconds?: number;
  minEligibleScore?: number;
}

const minute = 60;

export const SESSION_SEQUENCE: SessionConfig[] = [
  { sessionNumber: 1, sessionType: "APTITUDE", format: "MCQ", totalMarks: 10, questionCount: 10, marksPerQuestion: 1, durationSeconds: 15 * minute, minEligibleScore: 5 },
  { sessionNumber: 2, sessionType: "LOGICAL", format: "MCQ", totalMarks: 5, questionCount: 5, marksPerQuestion: 1, durationSeconds: 8 * minute, minEligibleScore: 3 },
  { sessionNumber: 3, sessionType: "REASONING", format: "MCQ", totalMarks: 5, questionCount: 5, marksPerQuestion: 1, durationSeconds: 7 * minute, minEligibleScore: 2 },
  // Session 4 ("Communication") is now a sentence-correction MCQ session —
  // previously LISTEN_REPEAT (audio record/playback). The sessionType enum
  // value stays COMMUNICATION (it's a Prisma enum; renaming it means a
  // migration), but format now routes it through the same generic MCQ path
  // as every other MCQ session: question.service's generateAndAssignSessionQuestions,
  // assessment.service's generic answer/scoring logic, and the frontend's
  // existing McqQuestionPanel component. No LISTEN_REPEAT-specific code
  // (audio module, CommunicationQuestionCard) is exercised anymore.
  { sessionNumber: 4, sessionType: "COMMUNICATION", format: "MCQ", totalMarks: 5, questionCount: 5, marksPerQuestion: 1, durationSeconds: 10 * minute, minEligibleScore: 3 },
  { sessionNumber: 5, sessionType: "GRAMMAR", format: "MCQ", totalMarks: 5, questionCount: 5, marksPerQuestion: 1, durationSeconds: 5 * minute },
  { sessionNumber: 6, sessionType: "EASY_CODING", format: "CODING", totalMarks: 20, questionCount: 2, marksPerQuestion: 10 },
  { sessionNumber: 7, sessionType: "MODERATE_CODING", format: "CODING", totalMarks: 20, questionCount: 1, marksPerQuestion: 20 },
  { sessionNumber: 8, sessionType: "HARD_CODING", format: "CODING", totalMarks: 30, questionCount: 1, marksPerQuestion: 30 },
];

export const GLOBAL_DURATION_SECONDS = 2 * 60 * minute + 15 * minute;
export const OVERALL_MIN_SCORE = 60;
export const TOTAL_MARKS = SESSION_SEQUENCE.reduce((sum, s) => sum + s.totalMarks, 0);

export const CODING_SCORE_WEIGHTS: Record<"EASY" | "MODERATE" | "HARD", { visible: number; hidden: number }> = {
  EASY: { visible: 0.5, hidden: 1 },
  MODERATE: { visible: 1, hidden: 2 },
  HARD: { visible: 1, hidden: 4 },
};

export function getSessionConfig(sessionType: SessionType): SessionConfig {
  const config = SESSION_SEQUENCE.find((s) => s.sessionType === sessionType);
  if (!config) throw new Error(`No session config for ${sessionType}`);
  return config;
}

export function getNextSessionConfig(sessionNumber: number): SessionConfig | undefined {
  return SESSION_SEQUENCE.find((s) => s.sessionNumber === sessionNumber + 1);
}

export const TOPICS_BY_SESSION: Partial<Record<SessionType, string[]>> = {
  APTITUDE: ["Percentages", "Profit and Loss", "Time and Work", "Time, Speed and Distance", "Ratios", "Averages", "Probability", "Permutations and Combinations", "Number Systems", "Simple Interest", "Compound Interest", "Data Interpretation"],
  LOGICAL: ["Number patterns", "Logical sequences", "Coding-decoding", "Syllogisms", "Blood relations", "Seating arrangements", "Statements and conclusions", "Logical puzzles"],
  REASONING: ["Analytical reasoning", "Verbal reasoning", "Non-verbal reasoning", "Analogies", "Classification", "Direction sense", "Pattern recognition", "Data sufficiency"],
  // Sentence-correction MCQs: each question gives a sentence (often with an
  // error) and four options; the candidate picks the grammatically correct
  // / best version. Distinct focus from GRAMMAR below, which covers broader
  // grammar topics rather than sentence-level correction specifically.
  COMMUNICATION: ["Sentence correction", "Spotting grammatical errors", "Choosing the correctly formed sentence", "Correct word usage in context", "Parallelism and sentence structure", "Redundancy and wordiness"],
  GRAMMAR: ["Tenses", "Articles", "Prepositions", "Subject-verb agreement", "Active/passive voice", "Direct/indirect speech", "Sentence correction", "Vocabulary", "Sentence completion"],
};