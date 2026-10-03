import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getCandidateIdForUser } from "../candidates/candidate.service";
import { recordEventSchema } from "./proctoring.validation";
import * as proctoringService from "./proctoring.service";

export const recordEvent = asyncHandler(async (req: Request, res: Response) => {
  // Resolved from the authenticated user, not the request body — matches
  // every other candidate-facing endpoint's rule of never trusting a
  // client-supplied candidate/assessment id.
  const candidateId = await getCandidateIdForUser(req.user!.id);
  const { eventType, confidence, metadata } = recordEventSchema.parse(req.body);
  const result = await proctoringService.recordEvent({ candidateId, eventType, confidence, metadata });
  res.status(200).json(result);
});
