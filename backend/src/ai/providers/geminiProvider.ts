import type { AIProvider } from "../AIProvider";
import { NotImplementedYetError } from "../AIProvider";
import type { ParsedResume, GeneratedQuestion, MatchResult, CandidateAnalysisResult, CommunicationScoreResult } from "../types";
import type { SessionType } from "@prisma/client";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { logger } from "../../utils/logger";
import { parseAiJson } from "../parseAiJson";

const RESUME_EXTRACTION_SYSTEM_PROMPT = `You extract structured data from resumes for a recruitment platform.
Respond with ONLY a single JSON object — no markdown fences, no commentary — matching exactly this shape:
{
  "candidateName": string | null,
  "education": [{ "degree": string, "institution": string, "year": string | null }],
  "skills": string[],
  "technicalSkills": string[],
  "programmingLanguages": string[],
  "frameworks": string[],
  "libraries": string[],
  "databases": string[],
  "tools": string[],
  "projects": [{ "name": string, "description": string }],
  "internships": string[],
  "experience": [{ "role": string, "company": string | null, "duration": string | null }],
  "certifications": string[],
  "achievements": string[],
  "technologies": string[]
}
Only include information actually present in the resume text. Use empty arrays, not omitted keys, for anything not found.`;

/**
 * Pulled out into its own named type (rather than an inline multi-line
 * generic at the call site) so `parseAiJson<GeneratedCodingQuestion[]>(raw)`
 * can stay on one simple line — the previous inline version had a lot of
 * nested `<`, `>`, `{`, `}` characters spanning multiple lines, which is
 * exactly the kind of thing that gets corrupted by some terminal paste
 * handling (this is what caused the "Expected '}' but found ';'" crash).
 */
interface GeneratedCodingQuestion {
  title: string;
  description: string;
  testCases: Array<{ input: string; expectedOutput: string; isHidden: boolean }>;
}

export class GeminiAIProvider implements AIProvider {
  private async callGenerateContent(system: string, userMessage: string): Promise<string> {
    if (!env.AI_API_KEY) {
      throw ApiError.badRequest(
        "AI_PROVIDER=gemini but AI_API_KEY is not set. Set AI_API_KEY (a Google AI Studio key) in .env, or use AI_PROVIDER=mock for local dev."
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.AI_MODEL}:generateContent?key=${env.AI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Gemini API call failed", { status: response.status, body });
      throw ApiError.badRequest("AI provider request failed");
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) {
      throw ApiError.badRequest("AI provider returned no text content");
    }
    return text;
  }

  async extractResume(rawResumeText: string): Promise<ParsedResume> {
    const raw = await this.callGenerateContent(RESUME_EXTRACTION_SYSTEM_PROMPT, rawResumeText.slice(0, 20_000));
    try {
      return parseAiJson<ParsedResume>(raw);
    } catch {
      logger.error("Failed to parse AI resume extraction as JSON", { raw });
      throw ApiError.badRequest("Resume analysis failed — could not parse AI response");
    }
  }

  async matchJobDescription(
    resume: ParsedResume,
    jobDescription: { title: string; description: string; requiredSkills: string[]; preferredSkills: string[] }
  ): Promise<MatchResult> {
    const system = `You compare a candidate's resume against a job description for a recruitment platform.
Respond with ONLY a single JSON object — no markdown fences, no commentary — matching exactly this shape:
{
  "matchingSkills": string[],
  "missingSkills": string[],
  "relevantProjects": string[],
  "relevantExperience": string[],
  "technicalStrengths": string[],
  "technicalGaps": string[],
  "resumeRelevance": "High" | "Medium" | "Low"
}
Base "resumeRelevance" primarily on how many required skills are covered. Only reference information actually present in the inputs below.`;

    const userMessage = JSON.stringify({
      jobTitle: jobDescription.title,
      jobDescription: jobDescription.description,
      requiredSkills: jobDescription.requiredSkills,
      preferredSkills: jobDescription.preferredSkills,
      candidateSkills: resume.skills,
      candidateProgrammingLanguages: resume.programmingLanguages,
      candidateProjects: resume.projects,
      candidateExperience: resume.experience,
    });

    const raw = await this.callGenerateContent(system, userMessage);
    try {
      return parseAiJson<MatchResult>(raw);
    } catch {
      logger.error("Failed to parse AI job match as JSON", { raw });
      throw ApiError.badRequest("Job match analysis failed — could not parse AI response");
    }
  }

  async generateQuestions(
    candidateProfile: ParsedResume,
    session: SessionType,
    count: number,
    difficulty: "EASY" | "MODERATE" | "HARD",
    topics: string[]
  ): Promise<GeneratedQuestion[]> {
    const profileSummary = JSON.stringify({
      skills: candidateProfile.skills.slice(0, 15),
      programmingLanguages: candidateProfile.programmingLanguages,
      projects: candidateProfile.projects.slice(0, 3).map((p) => p.name),
    });

    const system = `You write ${difficulty.toLowerCase()}-difficulty multiple-choice questions for a ${session} assessment section.
Allowed topics ONLY: ${topics.join(", ")}.
Respond with ONLY a JSON array (no markdown fences, no commentary) of exactly ${count} objects, each shaped:
{ "question": string, "difficulty": "${difficulty}", "options": [string, string, string, string], "correctAnswerIndex": 0 | 1 | 2 | 3 }
Rules: exactly 4 options per question, exactly one correct option, no duplicate options, no ambiguous wording, questions must be self-contained (no reference to "the passage above" etc), never repeat the same question twice in the array.`;

    const userMessage = `Candidate context (for light personalization only — stay within the allowed topics above):\n${profileSummary}\n\nGenerate the ${count} questions now.`;

    const raw = await this.callGenerateContent(system, userMessage);
    try {
      const parsed = parseAiJson<GeneratedQuestion[]>(raw);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      return parsed;
    } catch {
      logger.error("Failed to parse AI question generation as JSON", { raw });
      throw ApiError.badRequest("Question generation failed — could not parse AI response");
    }
  }

  async generateListenRepeatSentences(count: number): Promise<string[]> {
    const system = `You write short, natural, everyday workplace sentences for a listen-and-repeat communication assessment.
Respond with ONLY a JSON array of exactly ${count} strings — no markdown fences, no commentary.
Rules: each sentence is 8-16 words, plain professional English, no unusual proper nouns or numbers that would be hard to hear and repeat accurately, no two sentences alike.`;

    const raw = await this.callGenerateContent(system, `Generate ${count} sentences now.`);
    try {
      const parsed = parseAiJson<string[]>(raw);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      return parsed;
    } catch {
      logger.error("Failed to parse AI sentence generation as JSON", { raw });
      throw ApiError.badRequest("Sentence generation failed — could not parse AI response");
    }
  }

  async analyzeCommunication(transcript: string, referenceSentence: string): Promise<CommunicationScoreResult> {
    const system = `You score how accurately a candidate repeated a sentence they heard, for a recruitment platform's communication assessment.
Respond with ONLY a single JSON object — no markdown fences, no commentary — matching exactly this shape:
{
  "wordAccuracy": number,       // 0-1, fraction of reference words correctly repeated
  "sentenceSimilarity": number, // 0-1, overall similarity of meaning and wording
  "missingWords": string[],
  "additionalWords": string[],
  "fluency": number,            // 0-1, estimated from transcript coherence/length vs reference
  "clarity": number,            // 0-1
  "grammar": number,            // 0-1
  "score": number                // 0-1 overall score for this single response
}
Base every field strictly on comparing the transcript to the reference sentence given — never invent content not present in either.`;

    const userMessage = JSON.stringify({ referenceSentence, candidateTranscript: transcript });

    const raw = await this.callGenerateContent(system, userMessage);
    try {
      return parseAiJson<CommunicationScoreResult>(raw);
    } catch {
      logger.error("Failed to parse AI communication analysis as JSON", { raw });
      throw ApiError.badRequest("Communication analysis failed — could not parse AI response");
    }
  }

  async conductInterviewTurn(): ReturnType<AIProvider["conductInterviewTurn"]> {
    throw new NotImplementedYetError("conductInterviewTurn", "AI Interview");
  }

  async generateCodingQuestions(
    session: SessionType,
    difficulty: "EASY" | "MODERATE" | "HARD",
    count: number,
    marksPerQuestion: number
  ): ReturnType<AIProvider["generateCodingQuestions"]> {
    const system = `You write self-contained coding problems for a ${difficulty.toLowerCase()}-difficulty programming assessment (worth ${marksPerQuestion} marks each).
Respond with ONLY a JSON array (no markdown fences, no commentary) of exactly ${count} objects, each shaped:
{
  "title": string,
  "description": string,           // full problem statement, including input/output format and constraints
  "testCases": [
    { "input": string, "expectedOutput": string, "isHidden": false }  // exactly 10 of these
    // ...then exactly 5 more with "isHidden": true
  ]
}
Rules: each question needs EXACTLY 15 test cases total (10 isHidden:false, then 5 isHidden:true) covering edge cases (empty/min/max input, typical cases). "input" is exactly what would be piped to stdin; "expectedOutput" is exactly what the correct program would print to stdout, with no extra explanation. Compute every expectedOutput yourself, carefully, by mentally executing the intended solution — this is graded automatically, so a wrong expectedOutput fails a correct submission. Double check arithmetic and formatting (trailing newline conventions, spacing) before answering.`;

    const raw = await this.callGenerateContent(system, `Generate ${count} ${session} coding questions now.`);
    let parsed: GeneratedCodingQuestion[];
    try {
      parsed = parseAiJson<GeneratedCodingQuestion[]>(raw);
      if (!Array.isArray(parsed)) throw new Error("not an array");
    } catch {
      logger.error("Failed to parse AI coding question generation as JSON", { raw });
      throw ApiError.badRequest("Coding question generation failed — could not parse AI response");
    }

    const verified: typeof parsed = [];
    for (const q of parsed) {
      const ok = await this.verifyTestCases(q.description, q.testCases);
      if (ok) verified.push(q);
      else logger.warn("Discarding AI-generated coding question that failed self-verification", { title: q.title });
    }

    if (verified.length === 0) {
      throw ApiError.badRequest("AI-generated coding questions all failed verification — please try again");
    }
    return verified;
  }

  private async verifyTestCases(
    description: string,
    testCases: Array<{ input: string; expectedOutput: string }>
  ): Promise<boolean> {
    const system = `You are checking a coding problem's test cases for correctness, independent of whoever wrote them.
Given the problem description and a list of inputs, work out the correct expected stdout for each input yourself.
Respond with ONLY a JSON array of strings (no markdown fences, no commentary), one computed output per input, in the same order given.`;

    const userMessage = JSON.stringify({ description, inputs: testCases.map((t) => t.input) });

    try {
      const raw = await this.callGenerateContent(system, userMessage);
      const recomputed = parseAiJson<string[]>(raw);
      if (!Array.isArray(recomputed) || recomputed.length !== testCases.length) return false;
      return testCases.every((t, i) => t.expectedOutput.trim() === (recomputed[i] ?? "").trim());
    } catch {
      return false;
    }
  }

  async analyzeCandidate(assessmentSummary: Record<string, unknown>): Promise<CandidateAnalysisResult> {
    const system = `You write a concise, evidence-based hiring recommendation for a recruitment platform, based on a candidate's assessment results.
Respond with ONLY a single JSON object — no markdown fences, no commentary — matching exactly this shape:
{
  "technicalSkills": "Strong" | "Good" | "Moderate" | "Weak",
  "problemSolving": "Strong" | "Good" | "Moderate" | "Weak",
  "resumeMatch": "High" | "Medium" | "Low",
  "proctoringRisk": "Low" | "Medium" | "High",
  "recommendation": "Strongly Recommended" | "Recommended" | "Consider" | "Not Recommended",
  "reason": string
}
Base every field strictly on the assessment data given — never invent scores or events not present in it. "reason" should be 1-3 sentences citing specific numbers from the data. This is advisory input for a human reviewer, not a final decision.`;

    const raw = await this.callGenerateContent(system, JSON.stringify(assessmentSummary));
    try {
      return parseAiJson<CandidateAnalysisResult>(raw);
    } catch {
      logger.error("Failed to parse AI candidate analysis as JSON", { raw });
      throw ApiError.badRequest("Candidate analysis failed — could not parse AI response");
    }
  }
}