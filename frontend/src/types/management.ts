export interface DashboardCards {
  totalCandidates: number;
  registered: number;
  assessmentStarted: number;
  assessmentCompleted: number;
  eligible: number;
  notEligible: number;
  shortlisted: number;
  rejected: number;
  underReview: number;
  proctoringViolations: number;
}

export interface DashboardCharts {
  averageScore: number;
  sessionPerformance: { aptitude: number; logical: number; reasoning: number; communication: number; grammar: number };
  codingPerformance: { easy: number; moderate: number; hard: number };
}

export interface DashboardResponse {
  cards: DashboardCards;
  charts: DashboardCharts;
}

export interface CandidateListItem {
  candidateId: string;
  name: string;
  email: string;
  jobRole: string;
  resumeMatch: "High" | "Medium" | "Low" | null;
  overallScore: number | null;
  aptitude: number | null;
  logical: number | null;
  reasoning: number | null;
  communication: number | null;
  grammar: number | null;
  coding: number | null;
  eligibility: string;
  shortlistStatus: string;
  category: string | null;
  assessmentDate: string | null;
  assessmentStatus: string;
}

export interface MatchResult {
  matchingSkills: string[];
  missingSkills: string[];
  relevantProjects: string[];
  relevantExperience: string[];
  technicalStrengths: string[];
  technicalGaps: string[];
  resumeRelevance: "High" | "Medium" | "Low";
}

export interface CandidateAnalysis {
  technicalSkills: "Strong" | "Good" | "Moderate" | "Weak";
  problemSolving: "Strong" | "Good" | "Moderate" | "Weak";
  resumeMatch: "High" | "Medium" | "Low";
  proctoringRisk: "Low" | "Medium" | "High";
  recommendation: "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended";
  reason: string;
}

export interface CandidateDetailResponse {
  candidate: { id: string; name: string; email: string; phone: string; jobRole: string };
  resume: {
    uploadedAt: string;
    parsedData: Record<string, unknown>;
    matchResult: MatchResult | null;
    skills: { id: string; skill: string; proficiency: string | null }[];
  } | null;
  assessment: {
    status: string;
    eligibility: string;
    totalScore: number | null;
    startTime: string | null;
    endTime: string | null;
    resultReleaseTime: string | null;
    sessions: { sessionType: string; sessionNumber: number; status: string; score: number | null }[];
  } | null;
  score: Record<string, number> | null;
  codingSubmissions: Array<{
    question: string;
    session: string;
    marks: number;
    language: string | null;
    passedTests: number | null;
    totalTests: number | null;
    executionTimeMs: number | null;
    memoryUsageKb: number | null;
    compileError: string | null;
    runtimeError: string | null;
    sourceCode: string | null;
  }>;
  proctoring: {
    totalViolations: number;
    riskLevel: "Low" | "Medium" | "High" | "Critical";
    events: Array<{ eventType: string; severity: "INFO" | "WARNING" | "VIOLATION" | "CRITICAL"; timestamp: string; confidence: number | null }>;
  };
  aiRecommendation: CandidateAnalysis | null;
  shortlisting: { eligibility: string; finalStatus: string; category: string | null; managementComment: string | null } | null;
}
