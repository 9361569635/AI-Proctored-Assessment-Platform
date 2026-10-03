import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getCandidateIdForUser } from "../candidates/candidate.service";
import { capabilitySchema } from "./proctoring.validation";
import { recordCapabilities } from "./capability.service";

export const recordCapabilitiesController = asyncHandler(async (req: Request, res: Response) => {
  const candidateId = await getCandidateIdForUser(req.user!.id);
  const input = capabilitySchema.parse(req.body);
  const result = await recordCapabilities(candidateId, input);
  res.status(200).json({ id: result.id, checkedAt: result.checkedAt });
});
