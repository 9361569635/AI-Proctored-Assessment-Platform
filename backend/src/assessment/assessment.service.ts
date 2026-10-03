import { Prisma, type Assessment, type AssessmentSession, type SessionType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { getAIProvider, type MatchResult, type CandidateAnalysisResult } from "../ai";
import { getProctoringSummary } from "../proctoring/proctoringSummary";
import {
  SESSION_SEQUENCE,
  GLOBAL_DURATION_SECONDS,
  OVERALL_MIN_SCORE,
  getSessionConfig,
  getNextSessionConfig,
  type SessionConfig,
} from "./assessmentConfig";
import { generateAndAssignSessionQuestions, getSanitizedSessionQuestions } from "../questions/question.service";
import {
  assignCodingQuestionsToSession,
  getAssignedCodingQuestions,
  computeCodingSessionScore,
  haveAllQuestionsBeenRun,
} from "../coding/coding.service";
import {
  getAudioResponsesForSession,
  haveAllListenRepeatQuestionsAnswered,
  computeCommunicationSessionScore,
} from "../audio/audio.service";

type AssessmentWithSessions = Assessment & { sessions: AssessmentSession[] };

function computeGlobalRemainingSeconds(assessment: Pick<Assessment, "startTime">): number {
  if (!assessment.startTime) return GLOBAL_DURATION_SECONDS;
  const elapsed = (Date.now() - assessment.startTime.getTime()) / 1000;
  return Math.max(0, Math.round(GLOBAL_DURATION_SECONDS - elapsed));
}

function computeSessionRemainingSeconds(
  session: Pick<AssessmentSession, "startTime">,
  config: SessionConfig
): number | undefined {
  if (config.durationSeconds === undefined) return undefined;
  if (!session.startTime) return config.durationSeconds;
  const elapsed = (Date.now() - session.startTime.getTime()) / 1000;
  return Math.max(0, Math.round(config.durationSeconds - elapsed));
}

async function scoreSession(session: AssessmentSession, candidateId: string): Promise<number> {
  const config = getSessionConfig(session.sessionType);
  if (config.format === "CODING") {
    return computeCodingSessionScore(candidateId, session.id);
  }
  if (config.format === "LISTEN_REPEAT") {
    return computeCommunicationSessionScore(candidateId, session.id);
  }
  const result = await prisma.answer.aggregate({ where: { sessionId: session.id }, _sum: { marks: true } });
  return result._sum.marks ?? 0;
}

async function finalizeSession(
  session: AssessmentSession,
  assessment: Assessment,
  opts: { dueToGlobalTimeout: boolean }
): Promise<void> {
  if (session.status !== "IN_PROGRESS") return;

  const score = await scoreSession(session, assessment.candidateId);
  const now = new Date();
  const config = getSessionConfig(session.sessionType);
  const passedGate = config.minEligibleScore === undefined || score >= config.minEligibleScore;

  const markThisSessionCompleted = () =>
    prisma.assessmentSession.update({ where: { id: session.id }, data: { status: "COMPLETED", endTime: now, score } });

  if (!passedGate) {
    await markThisSessionCompleted();
    await finalizeAssessment(assessment.id, assessment.candidateId, "TERMINATED");
    return;
  }
  if (opts.dueToGlobalTimeout) {
    await markThisSessionCompleted();
    await finalizeAssessment(assessment.id, assessment.candidateId, "EXPIRED");
    return;
  }

  const nextConfig = getNextSessionConfig(session.sessionNumber);
  if (!nextConfig) {
    await markThisSessionCompleted();
    await finalizeAssessment(assessment.id, assessment.candidateId, "COMPLETED");
    return;
  }

  const nextSession = await prisma.assessmentSession.findFirstOrThrow({
    where: { assessmentId: assessment.id, sessionNumber: nextConfig.sessionNumber },
  });

  if (nextConfig.format === "MCQ" || nextConfig.format === "LISTEN_REPEAT") {
    await generateAndAssignSessionQuestions(nextSession.id, assessment.candidateId, nextConfig.sessionType);
  } else if (nextConfig.format === "CODING") {
    await assignCodingQuestionsToSession(nextSession.id, nextConfig.sessionType, nextConfig.questionCount, nextConfig.marksPerQuestion);
  }

  await markThisSessionCompleted();
  await prisma.assessmentSession.update({
    where: { id: nextSession.id },
    data: { status: "IN_PROGRESS", startTime: now },
  });
}

async function isEasyCodingPassed(candidateId: string): Promise<boolean> {
  const passing = await prisma.codingSubmission.findFirst({
    where: {
      candidateId,
      codingQuestion: { session: "EASY_CODING" },
      result: { is: { passedTests: { gte: 10 } } },
    },
  });
  return !!passing;
}

async function finalizeAssessment(
  assessmentId: string,
  candidateId: string,
  endReason: "COMPLETED" | "TERMINATED" | "EXPIRED"
): Promise<void> {
  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId } });
  if (assessment.status !== "IN_PROGRESS") return;

  const sessions = await prisma.assessmentSession.findMany({ where: { assessmentId } });
  const scoreFor = (type: SessionType) => sessions.find((s) => s.sessionType === type)?.score ?? 0;

  const scores = {
    aptitudeScore: scoreFor("APTITUDE"),
    logicalScore: scoreFor("LOGICAL"),
    reasoningScore: scoreFor("REASONING"),
    communicationScore: scoreFor("COMMUNICATION"),
    grammarScore: scoreFor("GRAMMAR"),
    easyCodingScore: scoreFor("EASY_CODING"),
    moderateCodingScore: scoreFor("MODERATE_CODING"),
    hardCodingScore: scoreFor("HARD_CODING"),
  };
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

  const easyCodingPassed = endReason === "COMPLETED" ? await isEasyCodingPassed(candidateId) : false;
  const eligible =
    endReason === "COMPLETED" &&
    totalScore >= OVERALL_MIN_SCORE &&
    scores.aptitudeScore >= 5 &&
    scores.logicalScore >= 3 &&
    scores.reasoningScore >= 2 &&
    scores.communicationScore >= 3 &&
    easyCodingPassed;

  const eligibility = eligible ? "ELIGIBLE" : "NOT_ELIGIBLE";
  const now = new Date();
  const resultReleaseTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let aiAnalysis: CandidateAnalysisResult | null = null;
  try {
    const [candidate, resume] = await Promise.all([
      prisma.candidate.findUnique({
        where: { id: candidateId },
        include: { user: { select: { name: true } }, jobRole: { select: { title: true } } },
      }),
      prisma.resume.findUnique({ where: { candidateId }, select: { matchResult: true } }),
    ]);
    const resumeRelevance = (resume?.matchResult as MatchResult | null)?.resumeRelevance ?? null;
    const proctoringSummary = await getProctoringSummary(assessmentId);

    aiAnalysis = await getAIProvider().analyzeCandidate({
      candidateName: candidate?.user.name ?? null,
      jobRoleTitle: candidate?.jobRole.title ?? null,
      totalScore,
      eligibility,
      endReason,
      sessionScores: scores,
      resumeRelevance,
      proctoringRisk: proctoringSummary.riskLevel,
      proctoringViolationCount: proctoringSummary.totalViolations,
    });
  } catch (err) {
    logger.error("AI candidate analysis failed", {
      candidateId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  await prisma.$transaction([
    prisma.assessment.update({
      where: { id: assessmentId },
      data: { status: endReason, endTime: now, totalScore, eligibility, resultReleaseTime },
    }),
    prisma.score.upsert({
      where: { candidateId },
      update: { ...scores, totalScore },
      create: { candidateId, ...scores, totalScore },
    }),
    prisma.shortlisting.upsert({
      where: { candidateId },
      update: {
        eligibility,
        resultReleaseAt: resultReleaseTime,
        aiAnalysis: aiAnalysis ? (aiAnalysis as unknown as object) : Prisma.DbNull,
      },
      create: {
        candidateId,
        eligibility,
        resultReleaseAt: resultReleaseTime,
        aiAnalysis: aiAnalysis ? (aiAnalysis as unknown as object) : Prisma.DbNull,
      },
    }),
  ]);
}

async function maybeHandleExpiry(assessment: AssessmentWithSessions): Promise<boolean> {
  const globalRemaining = computeGlobalRemainingSeconds(assessment);
  const current = assessment.sessions.find((s) => s.status === "IN_PROGRESS");

  if (globalRemaining <= 0) {
    if (current) {
      await finalizeSession(current, assessment, { dueToGlobalTimeout: true });
    } else {
      await finalizeAssessment(assessment.id, assessment.candidateId, "EXPIRED");
    }
    return true;
  }

  if (current) {
    const config = getSessionConfig(current.sessionType);
    const sessionRemaining = computeSessionRemainingSeconds(current, config);
    if (sessionRemaining !== undefined && sessionRemaining <= 0) {
      await finalizeSession(current, assessment, { dueToGlobalTimeout: false });
      return true;
    }
  }

  return false;
}

async function getInProgressAssessmentOrThrow(candidateId: string): Promise<AssessmentWithSessions> {
  const assessment = await prisma.assessment.findFirst({
    where: { candidateId, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
    include: { sessions: { orderBy: { sessionNumber: "asc" } } },
  });
  if (!assessment) throw ApiError.notFound("No in-progress assessment found");
  return assessment;
}

export async function terminateForProctoringViolation(candidateId: string): Promise<boolean> {
  const assessment = await prisma.assessment.findFirst({ where: { candidateId, status: "IN_PROGRESS" } });
  if (!assessment) return false;
  await finalizeAssessment(assessment.id, candidateId, "TERMINATED");
  return true;
}

export async function startAssessment(candidateId: string) {
  const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: candidateId } });

  const existing = await prisma.assessment.findFirst({ where: { candidateId }, orderBy: { createdAt: "desc" } });
  if (existing) {
    if (existing.status === "IN_PROGRESS") {
      return getAssessmentStatus(candidateId);
    }
    throw ApiError.conflict("You have already completed an assessment attempt.");
  }

  const resume = await prisma.resume.findUnique({ where: { candidateId } });
  if (!resume || !resume.parsedData || Object.keys(resume.parsedData as object).length === 0) {
    throw ApiError.badRequest("Upload and analyze your resume before starting the assessment.");
  }

  const created = await prisma.assessment.create({
    data: {
      candidateId,
      jobRoleId: candidate.jobRoleId,
      startTime: new Date(),
      status: "IN_PROGRESS",
      sessions: {
        create: SESSION_SEQUENCE.map((s) => ({ sessionNumber: s.sessionNumber, sessionType: s.sessionType, status: "LOCKED" })),
      },
    },
    include: { sessions: true },
  });

  const firstSession = created.sessions.find((s) => s.sessionNumber === 1)!;
  await prisma.assessmentSession.update({
    where: { id: firstSession.id },
    data: { status: "IN_PROGRESS", startTime: new Date() },
  });
  await generateAndAssignSessionQuestions(firstSession.id, candidateId, firstSession.sessionType);

  return getAssessmentStatus(candidateId);
}

export async function getAssessmentStatus(candidateId: string) {
  let assessment = await prisma.assessment.findFirst({
    where: { candidateId },
    orderBy: { createdAt: "desc" },
    include: { sessions: { orderBy: { sessionNumber: "asc" } } },
  });
  if (!assessment) return { status: "NOT_STARTED" as const };

  if (assessment.status === "IN_PROGRESS") {
    const changed = await maybeHandleExpiry(assessment);
    if (changed) {
      assessment = await prisma.assessment.findUniqueOrThrow({
        where: { id: assessment.id },
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
      });
    }
  }

  return {
    status: assessment.status,
    eligibility: assessment.eligibility,
    totalScore: assessment.totalScore,
    globalRemainingSeconds: assessment.status === "IN_PROGRESS" ? computeGlobalRemainingSeconds(assessment) : undefined,
    sessions: assessment.sessions.map((s) => ({
      sessionType: s.sessionType,
      sessionNumber: s.sessionNumber,
      status: s.status,
      score: s.score,
    })),
  };
}

export async function getCurrentSession(candidateId: string) {
  let assessment = await getInProgressAssessmentOrThrow(candidateId);
  const changed = await maybeHandleExpiry(assessment);
  if (changed) {
    const stillActive = await prisma.assessment.findUnique({ where: { id: assessment.id } });
    if (!stillActive || stillActive.status !== "IN_PROGRESS") {
      throw ApiError.conflict("Time expired - your assessment has been finalized. Check GET /assessment/result.");
    }
    assessment = await getInProgressAssessmentOrThrow(candidateId);
  }

  const current = assessment.sessions.find((s) => s.status === "IN_PROGRESS");
  if (!current) {
    throw ApiError.conflict("No active session available yet for this stage of the assessment.");
  }

  const config = getSessionConfig(current.sessionType);

  if (config.format === "MCQ" || config.format === "LISTEN_REPEAT") {
    const existingCount = await prisma.question.count({ where: { assessmentSessionId: current.id } });
    if (existingCount === 0) {
      await generateAndAssignSessionQuestions(current.id, candidateId, current.sessionType);
    }
  } else if (config.format === "CODING") {
    const existingCount = await prisma.sessionCodingQuestion.count({ where: { assessmentSessionId: current.id } });
    if (existingCount === 0) {
      await assignCodingQuestionsToSession(current.id, current.sessionType, config.questionCount, config.marksPerQuestion);
    }
  }

  const questions =
    config.format === "MCQ" || config.format === "LISTEN_REPEAT" ? await getSanitizedSessionQuestions(current.id) : [];
  const codingQuestions = config.format === "CODING" ? await getAssignedCodingQuestions(current.id, candidateId) : [];
  const audioResponses = config.format === "LISTEN_REPEAT" ? await getAudioResponsesForSession(candidateId, current.id) : [];
  const yourAnswers = await prisma.answer.findMany({
    where: { sessionId: current.id },
    select: { questionId: true, answer: true },
  });

  return {
    sessionId: current.id,
    sessionNumber: current.sessionNumber,
    sessionType: current.sessionType,
    format: config.format,
    totalMarks: config.totalMarks,
    globalRemainingSeconds: computeGlobalRemainingSeconds(assessment),
    sessionRemainingSeconds: computeSessionRemainingSeconds(current, config),
    questions,
    codingQuestions,
    audioResponses,
    yourAnswers,
  };
}

export async function submitAnswer(candidateId: string, sessionId: string, questionId: string, answerText: string) {
  const assessment = await getInProgressAssessmentOrThrow(candidateId);
  const expired = await maybeHandleExpiry(assessment);
  if (expired) {
    throw ApiError.conflict("Time expired - this session has been automatically finalized.");
  }

  const session = assessment.sessions.find((s) => s.id === sessionId);
  if (!session) throw ApiError.notFound("Session not found");
  if (session.status !== "IN_PROGRESS") {
    throw ApiError.forbidden("This session is not currently active - sessions must be completed in sequence.");
  }

  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.assessmentSessionId !== sessionId) {
    throw ApiError.badRequest("This question does not belong to the current session");
  }

  const config = getSessionConfig(session.sessionType);
  const isCorrect = answerText.trim() === question.correctAnswer.trim();
  const marks = isCorrect ? config.marksPerQuestion : 0;

  await prisma.answer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    update: { answer: answerText, isCorrect, marks },
    create: { sessionId, questionId, answer: answerText, isCorrect, marks },
  });

  return { saved: true };
}

export async function completeCurrentSession(candidateId: string, sessionId: string) {
  const assessment = await getInProgressAssessmentOrThrow(candidateId);
  const session = assessment.sessions.find((s) => s.id === sessionId);
  if (!session) throw ApiError.notFound("Session not found");
  if (session.status !== "IN_PROGRESS") {
    throw ApiError.forbidden("This session is not currently active");
  }

  const config = getSessionConfig(session.sessionType);
  if (config.format === "CODING") {
    const allRun = await haveAllQuestionsBeenRun(candidateId, session.id);
    if (!allRun) {
      throw ApiError.badRequest("Press RUN on every coding question in this session before completing it.");
    }
  }
  if (config.format === "LISTEN_REPEAT") {
    const allAnswered = await haveAllListenRepeatQuestionsAnswered(candidateId, session.id);
    if (!allAnswered) {
      throw ApiError.badRequest("Record a response for every sentence in this session before completing it.");
    }
  }

  await finalizeSession(session, assessment, { dueToGlobalTimeout: false });
  return getAssessmentStatus(candidateId);
}

export async function getResult(candidateId: string) {
  const assessment = await prisma.assessment.findFirst({ where: { candidateId }, orderBy: { createdAt: "desc" } });
  if (!assessment) throw ApiError.notFound("No assessment found");
  if (assessment.status === "IN_PROGRESS" || assessment.status === "NOT_STARTED") {
    throw ApiError.badRequest("Assessment is still in progress");
  }

  if (!assessment.resultReleaseTime || new Date() < assessment.resultReleaseTime) {
    return {
      status: "under_review" as const,
      message:
        "Your assessment has been submitted and is currently under review. Your final result will be available within 48 hours.",
      resultAvailableAt: assessment.resultReleaseTime,
    };
  }

  const [score, shortlisting, sessions] = await Promise.all([
    prisma.score.findUnique({ where: { candidateId } }),
    prisma.shortlisting.findUnique({ where: { candidateId } }),
    prisma.assessmentSession.findMany({ where: { assessmentId: assessment.id }, orderBy: { sessionNumber: "asc" } }),
  ]);

  const responsePayload = {
    status: "released" as const,
    overallScore: assessment.totalScore,
    eligibility: assessment.eligibility,
    finalStatus: shortlisting?.finalStatus ?? "UNDER_REVIEW",
    category: shortlisting?.category ?? null,
    sessionScores: sessions.map((s) => ({ sessionType: s.sessionType, score: s.score, status: s.status })),
    score,
  };

  if (shortlisting && !shortlisting.resultViewed) {
    await prisma.shortlisting.update({
      where: { candidateId },
      data: { resultViewed: true, resultViewedAt: new Date() },
    });

    if (shortlisting.finalStatus === "NOT_SHORTLISTED") {
      await deleteCandidateAssessmentRecord(candidateId, null, "AUTO_DELETE_NOT_SHORTLISTED");
    }
  }

  return responsePayload;
}

export async function deleteCandidateAssessmentRecord(
  candidateId: string,
  actorUserId: string | null,
  reason: "MANUAL_DELETE" | "AUTO_DELETE_NOT_SHORTLISTED"
): Promise<void> {
  await prisma.$transaction([
    prisma.codingSubmission.deleteMany({ where: { candidateId } }),
    prisma.audioResponse.deleteMany({ where: { candidateId } }),
    prisma.assessment.deleteMany({ where: { candidateId } }),
    prisma.score.deleteMany({ where: { candidateId } }),
    prisma.shortlisting.deleteMany({ where: { candidateId } }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: reason,
      entity: "Candidate",
      entityId: candidateId,
      metadata: { reason },
    },
  });
}