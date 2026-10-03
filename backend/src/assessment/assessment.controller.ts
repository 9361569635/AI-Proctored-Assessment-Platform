import type { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getCandidateIdForUser } from "../candidates/candidate.service";
import { submitAnswerSchema } from "./assessment.validation";
import * as assessmentService from "./assessment.service";

function requireSessionId(
  value: string | undefined
): string {
  if (!value) {
    throw ApiError.badRequest(
      "Session ID is required"
    );
  }

  return value;
}

export const start = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const status =
      await assessmentService.startAssessment(
        candidateId
      );

    res.status(201).json(status);
  }
);

export const status = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const result =
      await assessmentService.getAssessmentStatus(
        candidateId
      );

    res.status(200).json(result);
  }
);

export const currentSession = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const result =
      await assessmentService.getCurrentSession(
        candidateId
      );

    res.status(200).json(result);
  }
);

export const submitAnswer = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const sessionId = requireSessionId(
      req.params.sessionId
    );

    const {
      questionId,
      answer,
    } = submitAnswerSchema.parse(req.body);

    const result =
      await assessmentService.submitAnswer(
        candidateId,
        sessionId,
        questionId,
        answer
      );

    res.status(200).json(result);
  }
);

export const completeSession = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const sessionId = requireSessionId(
      req.params.sessionId
    );

    const result =
      await assessmentService.completeCurrentSession(
        candidateId,
        sessionId
      );

    res.status(200).json(result);
  }
);

export const result = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const result =
      await assessmentService.getResult(
        candidateId
      );

    res.status(200).json(result);
  }
);