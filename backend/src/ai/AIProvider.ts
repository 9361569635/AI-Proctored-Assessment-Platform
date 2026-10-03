import type {
  ParsedResume,
  MatchResult,
  GeneratedQuestion,
  CommunicationScoreResult,
  InterviewTurn,
  CandidateAnalysisResult,
} from "./types";
import type { SessionType } from "@prisma/client";

export interface AIProvider {
  extractResume(rawResumeText: string): Promise<ParsedResume>;

  matchJobDescription(
    resume: ParsedResume,
    jobDescription: { title: string; description: string; requiredSkills: string[]; preferredSkills: string[] }
  ): Promise<MatchResult>;

  generateQuestions(
    candidateProfile: ParsedResume,
    session: SessionType,
    count: number,
    difficulty: "EASY" | "MODERATE" | "HARD",
    topics: string[]
  ): Promise<GeneratedQuestion[]>;

  generateListenRepeatSentences(count: number): Promise<string[]>;

  analyzeCommunication(transcript: string, referenceSentence: string): Promise<CommunicationScoreResult>;

  conductInterviewTurn(history: InterviewTurn[], candidateProfile: ParsedResume): Promise<InterviewTurn>;

  analyzeCandidate(assessmentSummary: Record<string, unknown>): Promise<CandidateAnalysisResult>;

  generateCodingQuestions(
    session: SessionType,
    difficulty: "EASY" | "MODERATE" | "HARD",
    count: number,
    marksPerQuestion: number
  ): Promise<Array<{ title: string; description: string; testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }> }>>;
}

export class NotImplementedYetError extends Error {
  constructor(method: string, phase: string) {
    super(`AIProvider.${method}() is not implemented yet — it belongs to the "${phase}" build phase.`);
    this.name = "NotImplementedYetError";
  }
}
