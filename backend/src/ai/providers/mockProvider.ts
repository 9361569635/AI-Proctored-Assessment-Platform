import type { AIProvider } from "../AIProvider";
import { NotImplementedYetError } from "../AIProvider";

import type {
  ParsedResume,
  GeneratedQuestion,
  MatchResult,
  CandidateAnalysisResult,
  CommunicationScoreResult,
} from "../types";

import type { SessionType } from "@prisma/client";

import {
  pickQuestions,
  pickSentences,
  MOCK_QUESTION_BANK,
} from "./mockQuestionBank";

const KNOWN_SKILLS = [
  "Python",
  "Java",
  "JavaScript",
  "TypeScript",
  "C++",
  "C",
  "Go",
  "Rust",
  "Swift",
  "R",
  "React",
  "Angular",
  "Vue",
  "Node.js",
  "Express",
  "Django",
  "Flask",
  "Spring",
  "SQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "Git",
  "REST API",
  "GraphQL",
];

function findMatches(
  text: string,
  terms: string[]
): string[] {
  const lower = text.toLowerCase();

  return terms.filter((term) =>
    lower.includes(term.toLowerCase())
  );
}

export class MockAIProvider implements AIProvider {
  async extractResume(
    rawResumeText: string
  ): Promise<ParsedResume> {
    const found = findMatches(
      rawResumeText,
      KNOWN_SKILLS
    );

    const programmingLanguages = findMatches(
      rawResumeText,
      [
        "Python",
        "Java",
        "JavaScript",
        "TypeScript",
        "C++",
        "C",
        "Go",
        "Rust",
        "Swift",
        "R",
      ]
    );

    const frameworks = findMatches(
      rawResumeText,
      [
        "React",
        "Angular",
        "Vue",
        "Express",
        "Django",
        "Flask",
        "Spring",
      ]
    );

    const databases = findMatches(
      rawResumeText,
      [
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Redis",
        "SQL",
      ]
    );

    return {
      education: [],
      skills: found,
      technicalSkills: found,
      programmingLanguages,
      frameworks,
      libraries: [],
      databases,
      tools: findMatches(
        rawResumeText,
        [
          "Docker",
          "Kubernetes",
          "Git",
          "AWS",
          "Azure",
          "GCP",
        ]
      ),
      projects: [],
      internships: [],
      experience: [],
      certifications: [],
      achievements: [],
      technologies: found,
    };
  }

  async matchJobDescription(
    resume: ParsedResume,
    jobDescription: {
      title: string;
      description: string;
      requiredSkills: string[];
      preferredSkills: string[];
    }
  ): Promise<MatchResult> {
    const resumeSkills = new Set(
      [
        ...resume.skills,
        ...resume.technicalSkills,
        ...resume.programmingLanguages,
      ].map((skill) =>
        skill.toLowerCase()
      )
    );

    const matchingRequired =
      jobDescription.requiredSkills.filter(
        (skill) =>
          resumeSkills.has(
            skill.toLowerCase()
          )
      );

    const missingSkills =
      jobDescription.requiredSkills.filter(
        (skill) =>
          !resumeSkills.has(
            skill.toLowerCase()
          )
      );

    const matchingPreferred =
      jobDescription.preferredSkills.filter(
        (skill) =>
          resumeSkills.has(
            skill.toLowerCase()
          )
      );

    const requiredCount =
      jobDescription.requiredSkills.length ||
      1;

    const matchRatio =
      matchingRequired.length /
      requiredCount;

    const resumeRelevance:
      MatchResult["resumeRelevance"] =
      matchRatio >= 0.7
        ? "High"
        : matchRatio >= 0.4
          ? "Medium"
          : "Low";

    return {
      matchingSkills: [
        ...matchingRequired,
        ...matchingPreferred,
      ],
      missingSkills,
      relevantProjects:
        resume.projects.map(
          (project) => project.name
        ),
      relevantExperience:
        resume.experience.map(
          (experience) => experience.role
        ),
      technicalStrengths:
        matchingRequired,
      technicalGaps:
        missingSkills,
      resumeRelevance,
    };
  }

  async generateQuestions(
    _candidateProfile: ParsedResume,
    session: SessionType,
    count: number,
    _difficulty:
      | "EASY"
      | "MODERATE"
      | "HARD",
    _topics: string[]
  ): Promise<GeneratedQuestion[]> {
    if (!(session in MOCK_QUESTION_BANK)) {
      throw new NotImplementedYetError(
        "generateQuestions",
        `MCQ bank for ${session}`
      );
    }

    return pickQuestions(
      session as keyof typeof MOCK_QUESTION_BANK,
      count
    );
  }

  async generateListenRepeatSentences(
    count: number
  ): Promise<string[]> {
    return pickSentences(count);
  }

  async analyzeCommunication(
    transcript: string,
    referenceSentence: string
  ): Promise<CommunicationScoreResult> {
    const normalize = (
      text: string
    ): string[] =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s']/g, "")
        .split(/\s+/)
        .filter(Boolean);

    const refWords =
      normalize(referenceSentence);

    const transcriptWords =
      normalize(transcript);

    const refSet = new Set(refWords);

    const transcriptSet =
      new Set(transcriptWords);

    const missingWords =
      refWords.filter(
        (word) =>
          !transcriptSet.has(word)
      );

    const additionalWords =
      transcriptWords.filter(
        (word) =>
          !refSet.has(word)
      );

    const matchedCount =
      refWords.filter(
        (word) =>
          transcriptSet.has(word)
      ).length;

    const wordAccuracy =
      refWords.length > 0
        ? matchedCount / refWords.length
        : 0;

    const matchedUniqueWords =
      new Set(
        refWords.filter((word) =>
          transcriptSet.has(word)
        )
      );

    const union = new Set([
      ...refSet,
      ...transcriptSet,
    ]);

    const sentenceSimilarity =
      union.size > 0
        ? matchedUniqueWords.size /
          union.size
        : 0;

    const longer = Math.max(
      transcriptWords.length,
      refWords.length,
      1
    );

    const shorter = Math.min(
      transcriptWords.length,
      refWords.length
    );

    const fluency =
      shorter / longer;

    return {
      wordAccuracy,
      sentenceSimilarity,
      missingWords,
      additionalWords,
      fluency,
      clarity: wordAccuracy,
      grammar: wordAccuracy,
      score:
        (wordAccuracy +
          sentenceSimilarity) /
        2,
    };
  }

  async conductInterviewTurn(): ReturnType<
    AIProvider["conductInterviewTurn"]
  > {
    throw new NotImplementedYetError(
      "conductInterviewTurn",
      "AI Interview"
    );
  }

  async generateCodingQuestions(): ReturnType<
    AIProvider["generateCodingQuestions"]
  > {
    throw new NotImplementedYetError(
      "generateCodingQuestions",
      "AI-generated coding questions (gemini provider only)"
    );
  }

  async analyzeCandidate(
    assessmentSummary: Record<string, unknown>
  ): Promise<CandidateAnalysisResult> {
    /*
     * ---------------------------------------------------------
     * BASIC ASSESSMENT INFORMATION
     * ---------------------------------------------------------
     */

    const totalScore = Number(
      assessmentSummary.totalScore ?? 0
    );

    const eligibility = String(
      assessmentSummary.eligibility ??
        "NOT_ELIGIBLE"
    );

    /*
     * ---------------------------------------------------------
     * RESUME MATCH
     * ---------------------------------------------------------
     */

    const resumeRelevance =
      (assessmentSummary.resumeRelevance as
        | MatchResult["resumeRelevance"]
        | undefined) ?? "Low";

    /*
     * ---------------------------------------------------------
     * SESSION SCORES
     * ---------------------------------------------------------
     */

    const sessionScores =
      (assessmentSummary.sessionScores as
        | Record<string, number>
        | undefined) ?? {};

    /*
     * ---------------------------------------------------------
     * PROCTORING RISK
     * ---------------------------------------------------------
     *
     * Keep this aligned with the current
     * CandidateAnalysisResult type.
     */

    const proctoringRisk =
      (assessmentSummary.proctoringRisk as
        | CandidateAnalysisResult["proctoringRisk"]
        | undefined) ?? "Low";

    const proctoringViolationCount =
      Number(
        assessmentSummary.proctoringViolationCount ??
          0
      );

    /*
     * ---------------------------------------------------------
     * CODING PERFORMANCE
     * ---------------------------------------------------------
     *
     * Easy       = 20
     * Moderate   = 20
     * Hard       = 30
     */

    const easyCoding =
      Number(
        sessionScores.easyCoding ?? 0
      );

    const moderateCoding =
      Number(
        sessionScores.moderateCoding ?? 0
      );

    const hardCoding =
      Number(
        sessionScores.hardCoding ?? 0
      );

    const codingRatio =
      (
        easyCoding / 20 +
        moderateCoding / 20 +
        hardCoding / 30
      ) / 3;

    /*
     * ---------------------------------------------------------
     * SKILL LEVEL
     * ---------------------------------------------------------
     */

    const rate = (
      ratio: number
    ): CandidateAnalysisResult["technicalSkills"] => {
      if (ratio >= 0.8) {
        return "Strong";
      }

      if (ratio >= 0.6) {
        return "Good";
      }

      if (ratio >= 0.4) {
        return "Moderate";
      }

      return "Weak";
    };

    /*
     * ---------------------------------------------------------
     * INITIAL AI RECOMMENDATION
     * ---------------------------------------------------------
     */

    let recommendation:
      CandidateAnalysisResult["recommendation"];

    if (eligibility !== "ELIGIBLE") {
      recommendation =
        "Not Recommended";
    } else if (totalScore >= 85) {
      recommendation =
        "Strongly Recommended";
    } else if (totalScore >= 70) {
      recommendation =
        "Recommended";
    } else {
      recommendation =
        "Consider";
    }

    /*
     * ---------------------------------------------------------
     * PROCTORING ADJUSTMENT
     * ---------------------------------------------------------
     *
     * Current CandidateAnalysisResult type supports
     * the risk value used here.
     *
     * Do not reference "Critical" here unless the
     * CandidateAnalysisResult type is explicitly expanded
     * to include it.
     */

    if (
      proctoringRisk === "Medium" &&
      recommendation !==
        "Not Recommended"
    ) {
      recommendation = "Consider";
    }

    /*
     * ---------------------------------------------------------
     * FINAL AI ANALYSIS
     * ---------------------------------------------------------
     */

    return {
      technicalSkills:
        rate(codingRatio),

      problemSolving:
        rate(codingRatio),

      resumeMatch:
        resumeRelevance,

      proctoringRisk,

      recommendation,

      reason:
        `Overall score ${totalScore}/100, ` +
        `eligibility ${eligibility}, ` +
        `resume relevance ${resumeRelevance}, ` +
        `proctoring risk ${proctoringRisk} ` +
        `(${proctoringViolationCount} violation${
          proctoringViolationCount === 1
            ? ""
            : "s"
        }). ` +
        `${
          eligibility === "ELIGIBLE"
            ? "Met all session minimums and the 60/100 threshold."
            : "Did not meet one or more eligibility conditions."
        }`,
    };
  }
}