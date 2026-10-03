import type { SessionType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { getAIProvider, type GeneratedQuestion } from "../ai";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { getSessionConfig, TOPICS_BY_SESSION } from "../assessment/assessmentConfig";

/**
 * "AI must validate questions before displaying them" (spec §6): exactly 4
 * non-empty, non-duplicate options and exactly one valid correct index.
 * Anything that fails this is dropped rather than ever reaching a candidate.
 */
function isValidGeneratedQuestion(q: GeneratedQuestion): boolean {
  if (!q.question?.trim()) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (q.options.some((o) => !o?.trim())) return false;
  if (new Set(q.options.map((o) => o.trim())).size !== 4) return false;
  if (![0, 1, 2, 3].includes(q.correctAnswerIndex)) return false;
  return true;
}

/**
 * Generates a fresh, validated, single-use set of questions for one
 * candidate's session attempt and persists them (spec §6: relevant,
 * accurate, non-repetitive, personalized). Handles MCQ sessions
 * (Aptitude/Logical/Reasoning/Grammar) and LISTEN_REPEAT (Communication).
 * CODING questions come from a separate curated bank (see
 * backend/src/coding/coding.service.ts's assignCodingQuestionsToSession).
 */
export async function generateAndAssignSessionQuestions(assessmentSessionId: string, candidateId: string, sessionType: SessionType) {
  const config = getSessionConfig(sessionType);
  if (config.format !== "MCQ" && config.format !== "LISTEN_REPEAT") {
    throw new Error(`generateAndAssignSessionQuestions doesn't support ${config.format} sessions (got ${sessionType})`);
  }

  const ai = getAIProvider();

  if (config.format === "LISTEN_REPEAT") {
    // Reference sentences aren't personalized to the resume (spec §11
    // doesn't call for that the way MCQ generation does) — just generate
    // and store them, with the sentence itself as `correctAnswer` (the
    // text analyzeCommunication compares a transcript against).
    let sentences: string[];
    try {
      sentences = await ai.generateListenRepeatSentences(config.questionCount);
    } catch (err) {
      logger.error("Sentence generation failed", { sessionType, message: err instanceof Error ? err.message : String(err) });
      throw ApiError.badRequest("Couldn't generate sentences for this session — please try again");
    }

    const validSentences = sentences.filter((s) => s?.trim().length > 0);
    if (validSentences.length < config.questionCount) {
      throw ApiError.badRequest("Sentence generation didn't produce enough valid sentences — please try again");
    }

    await prisma.question.createMany({
      data: validSentences.slice(0, config.questionCount).map((sentence) => ({
        session: sessionType,
        question: sentence,
        difficulty: "MODERATE",
        options: [],
        correctAnswer: sentence,
        marks: config.marksPerQuestion,
        sourceType: "AI_GENERATED",
        assessmentSessionId,
      })),
    });

    return getSanitizedSessionQuestions(assessmentSessionId);
  }

  const resume = await prisma.resume.findUnique({ where: { candidateId } });
  if (!resume || !resume.parsedData || Object.keys(resume.parsedData as object).length === 0) {
    throw ApiError.badRequest("Analyze your resume before starting the assessment (POST /resume/analyze)");
  }

  const topics = TOPICS_BY_SESSION[sessionType] ?? [];

  let generated: GeneratedQuestion[];
  try {
    generated = await ai.generateQuestions(
      resume.parsedData as never,
      sessionType,
      config.questionCount,
      "MODERATE",
      topics
    );
  } catch (err) {
    logger.error("Question generation failed", { sessionType, message: err instanceof Error ? err.message : String(err) });
    throw ApiError.badRequest("Couldn't generate questions for this session — please try again");
  }

  const valid = generated.filter(isValidGeneratedQuestion);
  if (valid.length < config.questionCount) {
    logger.error("AI returned too few valid questions", {
      sessionType,
      requested: config.questionCount,
      validReturned: valid.length,
    });
    throw ApiError.badRequest("Question generation didn't produce enough valid questions — please try again");
  }

  const toCreate = valid.slice(0, config.questionCount);
  await prisma.question.createMany({
    data: toCreate.map((gq) => ({
      session: sessionType,
      question: gq.question,
      difficulty: gq.difficulty,
      options: gq.options,
      correctAnswer: gq.options[gq.correctAnswerIndex],
      marks: config.marksPerQuestion,
      sourceType: "AI_GENERATED",
      assessmentSessionId,
    })),
  });

  return getSanitizedSessionQuestions(assessmentSessionId);
}

/** Never includes correctAnswer — this is the only shape a candidate-facing route may return. */
export async function getSanitizedSessionQuestions(assessmentSessionId: string) {
  const questions = await prisma.question.findMany({
    where: { assessmentSessionId },
    orderBy: { createdAt: "asc" },
    select: { id: true, question: true, options: true, difficulty: true, marks: true },
  });
  return questions;
}
