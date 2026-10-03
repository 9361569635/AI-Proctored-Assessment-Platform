export type AssessmentOverallStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "TERMINATED" | "EXPIRED";
export type SessionType =
  | "APTITUDE"
  | "LOGICAL"
  | "REASONING"
  | "COMMUNICATION"
  | "GRAMMAR"
  | "EASY_CODING"
  | "MODERATE_CODING"
  | "HARD_CODING";
export type SessionStatus = "LOCKED" | "IN_PROGRESS" | "COMPLETED" | "FAILED_ELIGIBILITY";
export type QuestionFormat = "MCQ" | "LISTEN_REPEAT" | "CODING";
export type EligibilityStatus = "PENDING" | "ELIGIBLE" | "NOT_ELIGIBLE";
export type CodingLanguage = "PYTHON" | "C" | "CPP" | "JAVA" | "R" | "SWIFT";

export interface SessionSummary {
  sessionType: SessionType;
  sessionNumber: number;
  status: SessionStatus;
  score: number | null;
}

export interface AssessmentStatusResponse {
  status: AssessmentOverallStatus;
  eligibility?: EligibilityStatus;
  totalScore?: number | null;
  globalRemainingSeconds?: number;
  sessions?: SessionSummary[];
}

export interface McqQuestion {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
  marks: number;
}

export interface VisibleTestCase {
  id: string;
  input: string;
  expectedOutput: string;
}

export interface AssignedCodingQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  marks: number;
  visibleTestCases: VisibleTestCase[];
  hasRun: boolean;
}

export interface AudioResponseSummary {
  questionId: string;
  transcript: string | null;
  communicationScore: number | null;
}

export interface CurrentSessionResponse {
  sessionId: string;
  sessionNumber: number;
  sessionType: SessionType;
  format: QuestionFormat;
  totalMarks: number;
  globalRemainingSeconds: number;
  sessionRemainingSeconds?: number;
  questions: McqQuestion[];
  codingQuestions: AssignedCodingQuestion[];
  audioResponses: AudioResponseSummary[];
  yourAnswers: { questionId: string; answer: string }[];
}

interface TestCaseResultVisible {
  testCaseId: string;
  isHidden: false;
  passed: boolean;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}
interface TestCaseResultHidden {
  testCaseId: string;
  isHidden: true;
  passed: boolean;
}
export type TestCaseResult = TestCaseResultVisible | TestCaseResultHidden;

export interface RunOrSubmitResponse {
  compileError?: string;
  results: TestCaseResult[];
  totalCount: number;
  passed?: boolean;
  passedCount?: number;
}

export interface AudioSubmitResponse {
  id: string;
  transcript: string;
  communicationScore: number;
  wordAccuracy: number;
  missingWords: string[];
}

export interface AssessmentResultUnderReview {
  status: "under_review";
  message: string;
  resultAvailableAt: string | null;
}
export interface AssessmentResultReleased {
  status: "released";
  overallScore: number | null;
  eligibility: EligibilityStatus;
  finalStatus: string;
  category: string | null;
  sessionScores: { sessionType: SessionType; score: number | null; status: SessionStatus }[];
  score: Record<string, number> | null;
}
export type AssessmentResultResponse = AssessmentResultUnderReview | AssessmentResultReleased;
