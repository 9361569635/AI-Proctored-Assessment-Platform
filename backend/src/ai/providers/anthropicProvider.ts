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

export class AnthropicAIProvider implements AIProvider {
  private async callMessages(system: string, userMessage: string): Promise<string> {
    if (!env.AI_API_KEY) {
      throw ApiError.badRequest(
        "AI_PROVIDER=anthropic but AI_API_KEY is not set. Set AI_API_KEY in .env, or use AI_PROVIDER=mock for local dev."
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.AI_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Anthropic API call failed", { status: response.status, body });
      throw ApiError.badRequest("AI provider request failed");
    }

    const data = (await response.json()) as { content: Array<{ type: string; text?: string }> };
    const text = data.content.find((b) => b.type === "text")?.text;
    if (!text) {
      throw ApiError.badRequest("AI provider returned no text content");
    }
    return text;
  }

  async extractResume(rawResumeText: string): Promise<ParsedResume> {
    const raw = await this.callMessages(RESUME_EXTRACTION_SYSTEM_PROMPT, rawResumeText.slice(0, 20_000));
    try {
      return parseAiJson<ParsedResume>(raw);
    } catch (err) {
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

    const raw = await this.callMessages(system, userMessage);
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

    const raw = await this.callMessages(system, userMessage);
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

    const raw = await this.callMessages(system, `Generate ${count} sentences now.`);
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

    const raw = await this.callMessages(system, userMessage);
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

  async generateCodingQuestions(): ReturnType<AIProvider["generateCodingQuestions"]> {
    throw new NotImplementedYetError("generateCodingQuestions", "AI-generated coding questions (gemini provider only)");
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

    const raw = await this.callMessages(system, JSON.stringify(assessmentSummary));
    try {
      return parseAiJson<CandidateAnalysisResult>(raw);
    } catch {
      logger.error("Failed to parse AI candidate analysis as JSON", { raw });
      throw ApiError.badRequest("Candidate analysis failed — could not parse AI response");
    }
  }
}