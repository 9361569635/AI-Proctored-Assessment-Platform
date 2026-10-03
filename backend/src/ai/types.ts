/** Structured output of resume extraction — spec §4. */
export interface ParsedResume {
  candidateName?: string;
  education: Array<{ degree: string; institution: string; year?: string }>;
  skills: string[];
  technicalSkills: string[];
  programmingLanguages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  tools: string[];
  projects: Array<{ name: string; description: string }>;
  internships: string[];
  experience: Array<{ role: string; company?: string; duration?: string }>;
  certifications: string[];
  achievements: string[];
  technologies: string[];
}

/** Resume↔JD comparison output — spec §5, implemented (see backend/src/resume/resume.service.ts). */
export interface MatchResult {
  matchingSkills: string[];
  missingSkills: string[];
  relevantProjects: string[];
  relevantExperience: string[];
  technicalStrengths: string[];
  technicalGaps: string[];
  resumeRelevance: "High" | "Medium" | "Low";
}

/** Spec §6 — implemented (see backend/src/questions/question.service.ts). */
export interface GeneratedQuestion {
  question: string;
  difficulty: "EASY" | "MODERATE" | "HARD";
  options: [string, string, string, string];
  correctAnswerIndex: 0 | 1 | 2 | 3;
}

/** Spec §12/§44 — implemented (see backend/src/audio/audio.service.ts). */
export interface CommunicationScoreResult {
  wordAccuracy: number;
  sentenceSimilarity: number;
  missingWords: string[];
  additionalWords: string[];
  fluency: number;
  clarity: number;
  grammar: number;
  score: number; // out of 1 for this single response; session sums to /5
}

/** Spec §45 — descoped, not being built (the user explicitly asked to drop the AI Interview module). */
export interface InterviewTurn {
  role: "interviewer" | "candidate";
  message: string;
  category?: "technical" | "project" | "behavioral" | "job_specific";
}

/** Spec §46 — implemented (see backend/src/assessment/assessment.service.ts's finalizeAssessment). */
export interface CandidateAnalysisResult {
  technicalSkills: "Strong" | "Good" | "Moderate" | "Weak";
  problemSolving: "Strong" | "Good" | "Moderate" | "Weak";
  resumeMatch: "High" | "Medium" | "Low";
  proctoringRisk: "Low" | "Medium" | "High";
  recommendation: "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
  reason: string;
}
