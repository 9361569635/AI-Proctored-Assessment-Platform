import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { hashPassword } from "../utils/password";
import { getProctoringSummary } from "../proctoring/proctoringSummary";
import type { CreateManagementUserInput, ListCandidatesQuery, UpdateShortlistInput } from "./management.validation";

function sanitizeUser<T extends { passwordHash: string }>(user: T) {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

// ---------------------------------------------------------------------------
// Account provisioning — spec §2: SUPER_ADMIN "Manage management accounts".
// ---------------------------------------------------------------------------

export async function createManagementUser(input: CreateManagementUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "MANAGEMENT",
      managementUser: { create: { permissions: input.permissions } },
    },
    include: { managementUser: true },
  });
  return sanitizeUser(user);
}

// ---------------------------------------------------------------------------
// Dashboard — spec §47.
// ---------------------------------------------------------------------------

export async function getDashboard() {
  const [
    totalCandidates,
    started,
    completed,
    eligible,
    notEligible,
    shortlisted,
    rejected,
    underReview,
    proctoringViolations,
    avgScore,
    sessionAverages,
  ] = await Promise.all([
    prisma.candidate.count(),
    prisma.assessment.count({ where: { status: { in: ["IN_PROGRESS", "COMPLETED", "TERMINATED", "EXPIRED"] } } }),
    prisma.assessment.count({ where: { status: { in: ["COMPLETED", "TERMINATED", "EXPIRED"] } } }),
    prisma.assessment.count({ where: { eligibility: "ELIGIBLE" } }),
    prisma.assessment.count({ where: { eligibility: "NOT_ELIGIBLE" } }),
    prisma.shortlisting.count({ where: { finalStatus: "SHORTLISTED" } }),
    prisma.shortlisting.count({ where: { finalStatus: "REJECTED" } }),
    prisma.shortlisting.count({ where: { finalStatus: "UNDER_REVIEW" } }),
    prisma.proctoringEvent.count({ where: { severity: { in: ["VIOLATION", "CRITICAL"] } } }),
    prisma.score.aggregate({ _avg: { totalScore: true } }),
    prisma.score.aggregate({
      _avg: {
        aptitudeScore: true,
        logicalScore: true,
        reasoningScore: true,
        communicationScore: true,
        grammarScore: true,
        easyCodingScore: true,
        moderateCodingScore: true,
        hardCodingScore: true,
      },
    }),
  ]);

  return {
    cards: {
      totalCandidates,
      registered: totalCandidates,
      assessmentStarted: started,
      assessmentCompleted: completed,
      eligible,
      notEligible,
      shortlisted,
      rejected,
      underReview,
      proctoringViolations,
    },
    charts: {
      averageScore: avgScore._avg.totalScore ?? 0,
      sessionPerformance: {
        aptitude: sessionAverages._avg.aptitudeScore ?? 0,
        logical: sessionAverages._avg.logicalScore ?? 0,
        reasoning: sessionAverages._avg.reasoningScore ?? 0,
        communication: sessionAverages._avg.communicationScore ?? 0,
        grammar: sessionAverages._avg.grammarScore ?? 0,
      },
      codingPerformance: {
        easy: sessionAverages._avg.easyCodingScore ?? 0,
        moderate: sessionAverages._avg.moderateCodingScore ?? 0,
        hard: sessionAverages._avg.hardCodingScore ?? 0,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Candidate list — spec §48.
// ---------------------------------------------------------------------------

export async function listCandidates(filters: ListCandidatesQuery) {
  const where: Prisma.CandidateWhereInput = {};
  if (filters.jobRoleId) where.jobRoleId = filters.jobRoleId;
  if (filters.eligibility) where.assessments = { some: { eligibility: filters.eligibility } };
  if (filters.finalStatus) where.shortlisting = { finalStatus: filters.finalStatus };
  if (filters.search) {
    where.OR = [
      { user: { name: { contains: filters.search, mode: "insensitive" } } },
      { user: { email: { contains: filters.search, mode: "insensitive" } } },
      { phone: { contains: filters.search } },
    ];
  }

  const candidates = await prisma.candidate.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      jobRole: { select: { title: true } },
      resume: { select: { matchResult: true } },
      score: true,
      shortlisting: true,
      assessments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, eligibility: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return candidates.map((c) => {
    const latestAssessment = c.assessments[0];
    const matchResult = c.resume?.matchResult as { resumeRelevance?: string } | null;
    return {
      candidateId: c.id,
      name: c.user.name,
      email: c.user.email,
      jobRole: c.jobRole.title,
      resumeMatch: matchResult?.resumeRelevance ?? null,
      overallScore: c.score?.totalScore ?? null,
      aptitude: c.score?.aptitudeScore ?? null,
      logical: c.score?.logicalScore ?? null,
      reasoning: c.score?.reasoningScore ?? null,
      communication: c.score?.communicationScore ?? null,
      grammar: c.score?.grammarScore ?? null,
      coding: c.score ? c.score.easyCodingScore + c.score.moderateCodingScore + c.score.hardCodingScore : null,
      eligibility: latestAssessment?.eligibility ?? "PENDING",
      shortlistStatus: c.shortlisting?.finalStatus ?? "PENDING",
      category: c.shortlisting?.category ?? null,
      assessmentDate: latestAssessment?.createdAt ?? null,
      assessmentStatus: latestAssessment?.status ?? "NOT_STARTED",
    };
  });
}

// ---------------------------------------------------------------------------
// Candidate detail — spec §49-51.
// ---------------------------------------------------------------------------

const CODING_SESSION_TYPES = ["EASY_CODING", "MODERATE_CODING", "HARD_CODING"] as const;

export async function getCandidateDetail(candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: {
      user: { select: { name: true, email: true } },
      jobRole: { select: { title: true } },
      resume: true,
      skills: true,
      score: true,
      shortlisting: true,
      assessments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sessions: { orderBy: { sessionNumber: "asc" } } },
      },
    },
  });
  if (!candidate) throw ApiError.notFound("Candidate not found");

  const assessment = candidate.assessments[0];

  let codingSubmissions: Array<{
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
  }> = [];

  if (assessment) {
    const codingSessionIds = assessment.sessions
      .filter((s) => (CODING_SESSION_TYPES as readonly string[]).includes(s.sessionType))
      .map((s) => s.id);

    if (codingSessionIds.length > 0) {
      const assignments = await prisma.sessionCodingQuestion.findMany({
        where: { assessmentSessionId: { in: codingSessionIds } },
        include: { codingQuestion: { select: { id: true, title: true, session: true, marks: true } } },
      });

      codingSubmissions = await Promise.all(
        assignments.map(async (a) => {
          const latest = await prisma.codingSubmission.findFirst({
            where: { candidateId, codingQuestionId: a.codingQuestionId },
            orderBy: { submittedAt: "desc" },
            include: { result: true },
          });
          return {
            question: a.codingQuestion.title,
            session: a.codingQuestion.session,
            marks: a.codingQuestion.marks,
            language: latest?.language ?? null,
            passedTests: latest?.result?.passedTests ?? null,
            totalTests: latest?.result?.totalTests ?? null,
            executionTimeMs: latest?.result?.executionTimeMs ?? null,
            memoryUsageKb: latest?.result?.memoryUsageKb ?? null,
            // Hidden test case input/output was never persisted in the
            // first place (see CodingResult.testCaseResults' schema
            // comment) — nothing to redact here, there's simply nothing to leak.
            compileError: latest?.result?.compileError ?? null,
            runtimeError: latest?.result?.runtimeError ?? null,
            sourceCode: latest?.sourceCode ?? null,
          };
        })
      );
    }
  }

  return {
    candidate: {
      id: candidate.id,
      name: candidate.user.name,
      email: candidate.user.email,
      phone: candidate.phone,
      jobRole: candidate.jobRole.title,
    },
    resume: candidate.resume
      ? {
          uploadedAt: candidate.resume.uploadedAt,
          parsedData: candidate.resume.parsedData,
          matchResult: candidate.resume.matchResult,
          skills: candidate.skills,
        }
      : null,
    assessment: assessment
      ? {
          status: assessment.status,
          eligibility: assessment.eligibility,
          totalScore: assessment.totalScore,
          startTime: assessment.startTime,
          endTime: assessment.endTime,
          resultReleaseTime: assessment.resultReleaseTime,
          sessions: assessment.sessions.map((s) => ({
            sessionType: s.sessionType,
            sessionNumber: s.sessionNumber,
            status: s.status,
            score: s.score,
          })),
        }
      : null,
    score: candidate.score,
    codingSubmissions,
    proctoring: assessment
      ? await getProctoringSummary(assessment.id)
      : { totalViolations: 0, riskLevel: "Low" as const, events: [] },
    // Computed once at assessment finalization (spec §46) — see
    // backend/src/assessment/assessment.service.ts's finalizeAssessment.
    // Null if the assessment hasn't finished yet, or if the AI call failed
    // when it did (advisory only — never blocks finalization).
    aiRecommendation: candidate.shortlisting?.aiAnalysis ?? null,
    shortlisting: candidate.shortlisting,
  };
}

// ---------------------------------------------------------------------------
// Shortlisting override — spec §52-53: every manual change is audit-logged.
// ---------------------------------------------------------------------------

export async function updateShortlistStatus(managementUserId: string, candidateId: string, input: UpdateShortlistInput) {
  const existing = await prisma.shortlisting.findUnique({ where: { candidateId } });
  if (!existing) {
    throw ApiError.badRequest("This candidate has no finalized assessment to shortlist yet");
  }

  const updated = await prisma.shortlisting.update({
    where: { candidateId },
    data: {
      ...(input.category !== undefined && { category: input.category }),
      ...(input.finalStatus !== undefined && { finalStatus: input.finalStatus }),
      ...(input.comment !== undefined && { managementComment: input.comment }),
      finalizedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: managementUserId,
      action: "SHORTLIST_STATUS_CHANGE",
      entity: "Candidate",
      entityId: candidateId,
      metadata: {
        previousCategory: existing.category,
        newCategory: updated.category,
        previousFinalStatus: existing.finalStatus,
        newFinalStatus: updated.finalStatus,
        comment: input.comment ?? null,
      },
    },
  });

  return updated;
}
