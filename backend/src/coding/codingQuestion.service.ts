import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import type { CreateCodingQuestionInput } from "./codingQuestion.validation";

export async function createCodingQuestion(
  input: CreateCodingQuestionInput
) {
  return prisma.codingQuestion.create({
    data: {
      session: input.session,
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      marks: input.marks,
      testCases: {
        create: input.testCases,
      },
    },
    select: {
      id: true,
      session: true,
      title: true,
      difficulty: true,
      marks: true,
    },
  });
}

/**
 * Never exposes hidden test-case input/expectedOutput.
 * Only visible test cases are returned.
 */
export async function listCodingQuestions() {
  const questions = await prisma.codingQuestion.findMany({
    include: {
      testCases: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  return questions.map(redact);
}

export async function getCodingQuestion(id: string) {
  const question = await prisma.codingQuestion.findUnique({
    where: { id },
    include: {
      testCases: true,
    },
  });

  if (!question) {
    throw ApiError.notFound("Coding question not found");
  }

  return redact(question);
}

function redact<
  T extends {
    testCases: Array<{
      id: string;
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }>;
  }
>(q: T) {
  const visible = q.testCases.filter(
    (testCase) => !testCase.isHidden
  );

  const hiddenCount =
    q.testCases.length - visible.length;

  return {
    ...q,
    testCases: undefined,
    visibleTestCases: visible,
    hiddenTestCaseCount: hiddenCount,
  };
}