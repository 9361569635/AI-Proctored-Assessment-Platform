import type {
  CodingLanguage,
  QuestionDifficulty,
  SessionType,
} from "@prisma/client";

import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { executeSubmission, type ExecTestCase } from "./executor";
import { assertOwnedActiveSession } from "../assessment/sessionAccess";
import { getAIProvider } from "../ai";
import { logger } from "../utils/logger";
import { CODING_SCORE_WEIGHTS } from "../assessment/assessmentConfig";

const DIFFICULTY_BY_SESSION: Record<
  string,
  "EASY" | "MODERATE" | "HARD"
> = {
  EASY_CODING: "EASY",
  MODERATE_CODING: "MODERATE",
  HARD_CODING: "HARD",
};

export async function assignCodingQuestionsToSession(
  assessmentSessionId: string,
  sessionType: SessionType,
  count: number,
  marksPerQuestion: number
) {
  let pool = await prisma.codingQuestion.findMany({
    where: { session: sessionType },
    select: { id: true },
  });

  if (pool.length < count) {
    const needed = count - pool.length;

    logger.warn(
      "Curated coding bank short on questions - generating with AI",
      {
        sessionType,
        needed,
      }
    );

    const difficulty =
      DIFFICULTY_BY_SESSION[sessionType] ?? "MODERATE";

    const generated =
      await getAIProvider().generateCodingQuestions(
        sessionType,
        difficulty,
        needed,
        marksPerQuestion
      );

    for (const q of generated) {
      const created = await prisma.codingQuestion.create({
        data: {
          session: sessionType,
          title: q.title,
          description: q.description,
          difficulty,
          marks: marksPerQuestion,
          testCases: {
            create: q.testCases,
          },
        },
        select: { id: true },
      });

      pool.push(created);
    }

    if (pool.length < count) {
      throw ApiError.badRequest(
        `Not enough coding questions for ${sessionType} even after AI generation (need ${count}, have ${pool.length}).`
      );
    }
  }

  const shuffled = [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  await prisma.sessionCodingQuestion.createMany({
    data: shuffled.map((q, i) => ({
      assessmentSessionId,
      codingQuestionId: q.id,
      order: i,
    })),
  });
}

export async function getAssignedCodingQuestions(
  assessmentSessionId: string,
  candidateId: string
) {
  const assignments =
    await prisma.sessionCodingQuestion.findMany({
      where: { assessmentSessionId },
      orderBy: { order: "asc" },
      include: {
        codingQuestion: {
          include: {
            testCases: {
              where: { isHidden: false },
              select: {
                id: true,
                input: true,
                expectedOutput: true,
              },
            },
          },
        },
      },
    });

  const runRows = await prisma.codingSubmission.findMany({
    where: {
      candidateId,
      codingQuestionId: {
        in: assignments.map((a) => a.codingQuestionId),
      },
      result: {
        isNot: null,
      },
    },
    select: {
      codingQuestionId: true,
    },
    distinct: ["codingQuestionId"],
  });

  const ranQuestionIds = new Set(
    runRows.map((r) => r.codingQuestionId)
  );

  return assignments.map((a) => ({
    id: a.codingQuestion.id,
    title: a.codingQuestion.title,
    description: a.codingQuestion.description,
    difficulty: a.codingQuestion.difficulty,
    marks: a.codingQuestion.marks,
    visibleTestCases: a.codingQuestion.testCases,
    hasRun: ranQuestionIds.has(a.codingQuestion.id),
  }));
}

async function assertAssignedQuestion(
  assessmentSessionId: string,
  codingQuestionId: string
) {
  const assignment =
    await prisma.sessionCodingQuestion.findUnique({
      where: {
        assessmentSessionId_codingQuestionId: {
          assessmentSessionId,
          codingQuestionId,
        },
      },
    });

  if (!assignment) {
    throw ApiError.badRequest(
      "This coding question is not part of your current session"
    );
  }
}

export async function submitCode(params: {
  candidateId: string;
  sessionId: string;
  codingQuestionId: string;
  language: CodingLanguage;
  sourceCode: string;
}) {
  const {
    candidateId,
    sessionId,
    codingQuestionId,
    language,
    sourceCode,
  } = params;

  await assertOwnedActiveSession(candidateId, sessionId);
  await assertAssignedQuestion(sessionId, codingQuestionId);

  const visibleTestCases = await prisma.testCase.findMany({
    where: {
      codingQuestionId,
      isHidden: false,
    },
  });

  const summary = await executeSubmission(
    language,
    sourceCode,
    toExecTestCases(visibleTestCases)
  );

  await prisma.codingSubmission.create({
    data: {
      candidateId,
      codingQuestionId,
      language,
      sourceCode,
    },
  });

  return serializeForCandidate(
    summary,
    visibleTestCases.length
  );
}

export async function runCode(params: {
  candidateId: string;
  sessionId: string;
  codingQuestionId: string;
  language: CodingLanguage;
  sourceCode: string;
}) {
  const {
    candidateId,
    sessionId,
    codingQuestionId,
    language,
    sourceCode,
  } = params;

  await assertOwnedActiveSession(candidateId, sessionId);
  await assertAssignedQuestion(sessionId, codingQuestionId);

  const question =
    await prisma.codingQuestion.findUniqueOrThrow({
      where: {
        id: codingQuestionId,
      },
      select: {
        difficulty: true,
      },
    });

  const allTestCases = await prisma.testCase.findMany({
    where: {
      codingQuestionId,
    },
  });

  const summary = await executeSubmission(
    language,
    sourceCode,
    toExecTestCases(allTestCases)
  );

  const candidateView = serializeForCandidate(
    summary,
    allTestCases.length
  );

  const runtimeError = summary.results.find(
    (r) =>
      !r.isHidden &&
      !r.passed &&
      r.stderr.trim().length > 0
  )?.stderr;

  const marksEarned = summary.compileError
    ? 0
    : computeWeightedScore(
        summary.results,
        question.difficulty
      );

  const submission =
    await prisma.codingSubmission.create({
      data: {
        candidateId,
        codingQuestionId,
        language,
        sourceCode,
      },
    });

  await prisma.codingResult.create({
    data: {
      submissionId: submission.id,
      passedTests: summary.passedCount,
      totalTests: summary.totalCount,
      score: marksEarned,
      executionTimeMs:
        summary.maxExecutionTimeMs,
      memoryUsageKb:
        summary.maxMemoryUsageKb,
      compileError: summary.compileError,
      runtimeError:
        runtimeError?.slice(0, 4000),
      testCaseResults:
        candidateView.results as object[],
    },
  });

  return {
    ...candidateView,
    executed: true,
    passedCount: summary.passedCount,
    totalCount: summary.totalCount,
  };
}

function computeWeightedScore(
  results: Array<{
    isHidden: boolean;
    passed: boolean;
  }>,
  difficulty: QuestionDifficulty
): number {
  const weights =
    CODING_SCORE_WEIGHTS[difficulty];

  const visiblePassed = results.filter(
    (r) => !r.isHidden && r.passed
  ).length;

  const hiddenPassed = results.filter(
    (r) => r.isHidden && r.passed
  ).length;

  return (
    visiblePassed * weights.visible +
    hiddenPassed * weights.hidden
  );
}

function toExecTestCases(
  rows: Array<{
    id: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
  }>
): ExecTestCase[] {
  return rows.map((r) => ({
    id: r.id,
    input: r.input,
    expectedOutput: r.expectedOutput,
    isHidden: r.isHidden,
  }));
}

function serializeForCandidate(
  summary: Awaited<
    ReturnType<typeof executeSubmission>
  >,
  totalCount: number
) {
  if (summary.compileError) {
    return {
      compileError: summary.compileError,
      results: [] as unknown[],
      totalCount,
    };
  }

  return {
    results: summary.results.map((r) =>
      r.isHidden
        ? {
            testCaseId: r.testCaseId,
            isHidden: true,
            passed: r.passed,
          }
        : {
            testCaseId: r.testCaseId,
            isHidden: false,
            passed: r.passed,
            stdout: r.stdout,
            stderr: r.stderr,
            timedOut: r.timedOut,
          }
    ),
    totalCount,
  };
}

export async function haveAllQuestionsBeenRun(
  candidateId: string,
  assessmentSessionId: string
): Promise<boolean> {
  const assignments =
    await prisma.sessionCodingQuestion.findMany({
      where: {
        assessmentSessionId,
      },
    });

  if (assignments.length === 0) {
    return false;
  }

  for (const assignment of assignments) {
    const ranAtLeastOnce =
      await prisma.codingSubmission.findFirst({
        where: {
          candidateId,
          codingQuestionId:
            assignment.codingQuestionId,
          result: {
            isNot: null,
          },
        },
      });

    if (!ranAtLeastOnce) {
      return false;
    }
  }

  return true;
}

export async function computeCodingSessionScore(
  candidateId: string,
  assessmentSessionId: string
): Promise<number> {
  const assignments =
    await prisma.sessionCodingQuestion.findMany({
      where: {
        assessmentSessionId,
      },
    });

  let total = 0;

  for (const assignment of assignments) {
    const latestRun =
      await prisma.codingSubmission.findFirst({
        where: {
          candidateId,
          codingQuestionId:
            assignment.codingQuestionId,
          result: {
            isNot: null,
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        include: {
          result: true,
        },
      });

    if (latestRun?.result) {
      total += latestRun.result.score;
    }
  }

  return total;
}

export async function saveCodeDraft(params: {
  candidateId: string;
  sessionId: string;
  codingQuestionId: string;
  language: CodingLanguage;
  sourceCode: string;
}): Promise<void> {
  const {
    candidateId,
    sessionId,
    codingQuestionId,
    language,
    sourceCode,
  } = params;

  await assertOwnedActiveSession(
    candidateId,
    sessionId
  );

  await assertAssignedQuestion(
    sessionId,
    codingQuestionId
  );

  /*
   * The CodeDraft unique key is:
   *
   * candidateId
   * assessmentId
   * sessionId
   * codingQuestionId
   * language
   *
   * Therefore we first obtain assessmentId from the
   * current assessment session.
   */
  const assessmentSession =
    await prisma.assessmentSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        assessmentId: true,
      },
    });

  if (!assessmentSession) {
    throw ApiError.badRequest(
      "Assessment session not found"
    );
  }

  await prisma.codeDraft.upsert({
    where: {
      candidateId_assessmentId_sessionId_codingQuestionId_language:
        {
          candidateId,
          assessmentId:
            assessmentSession.assessmentId,
          sessionId,
          codingQuestionId,
          language,
        },
    },
    update: {
      sourceCode,
    },
    create: {
      candidateId,
      assessmentId:
        assessmentSession.assessmentId,
      sessionId,
      codingQuestionId,
      language,
      sourceCode,
    },
  });
}

export async function getCodeDrafts(
  candidateId: string,
  sessionId: string,
  codingQuestionId: string
): Promise<
  Partial<Record<CodingLanguage, string>>
> {
  await assertOwnedActiveSession(
    candidateId,
    sessionId
  );

  await assertAssignedQuestion(
    sessionId,
    codingQuestionId
  );

  const drafts = await prisma.codeDraft.findMany({
    where: {
      candidateId,
      sessionId,
      codingQuestionId,
    },
    select: {
      language: true,
      sourceCode: true,
    },
  });

  return Object.fromEntries(
    drafts.map((draft) => [
      draft.language,
      draft.sourceCode,
    ])
  );
}