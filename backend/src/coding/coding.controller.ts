import type { Request, Response } from "express";

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getCandidateIdForUser } from "../candidates/candidate.service";
import {
  runOrSubmitSchema,
  saveDraftSchema,
} from "./coding.validation";
import * as codingService from "./coding.service";

function requireParam(
  value: string | undefined,
  name: string
): string {
  if (!value) {
    throw ApiError.badRequest(
      `${name} is required`
    );
  }

  return value;
}

export const submit = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const sessionId = requireParam(
      req.params.sessionId,
      "Session ID"
    );

    const {
      codingQuestionId,
      language,
      sourceCode,
    } = runOrSubmitSchema.parse(req.body);

    const result =
      await codingService.submitCode({
        candidateId,
        sessionId,
        codingQuestionId,
        language,
        sourceCode,
      });

    res.status(200).json(result);
  }
);

export const run = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const sessionId = requireParam(
      req.params.sessionId,
      "Session ID"
    );

    const {
      codingQuestionId,
      language,
      sourceCode,
    } = runOrSubmitSchema.parse(req.body);

    const result =
      await codingService.runCode({
        candidateId,
        sessionId,
        codingQuestionId,
        language,
        sourceCode,
      });

    res.status(200).json(result);
  }
);

export const saveDraft = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const sessionId = requireParam(
      req.params.sessionId,
      "Session ID"
    );

    const codingQuestionId = requireParam(
      req.params.codingQuestionId,
      "Coding question ID"
    );

    const {
      language,
      sourceCode,
    } = saveDraftSchema.parse(req.body);

    await codingService.saveCodeDraft({
      candidateId,
      sessionId,
      codingQuestionId,
      language,
      sourceCode,
    });

    res.status(204).send();
  }
);

export const getDrafts = asyncHandler(
  async (req: Request, res: Response) => {
    const candidateId =
      await getCandidateIdForUser(req.user!.id);

    const sessionId = requireParam(
      req.params.sessionId,
      "Session ID"
    );

    const codingQuestionId = requireParam(
      req.params.codingQuestionId,
      "Coding question ID"
    );

    const drafts =
      await codingService.getCodeDrafts(
        candidateId,
        sessionId,
        codingQuestionId
      );

    res.status(200).json({ drafts });
  }
);