import type { Request, Response } from "express";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getCandidateIdForUser } from "../candidates/candidate.service";
import * as audioService from "./audio.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

export const audioUploadMiddleware =
  upload.single("audio");

/**
 * Legacy Listen-and-Repeat audio prompt.
 *
 * Session 4 is now Sentence Correction, so
 * audio prompts are no longer supported.
 */
export const prompt = asyncHandler(
  async (_req: Request, _res: Response) => {
    throw ApiError.badRequest(
      "Audio prompts are not available for the current Sentence Correction assessment."
    );
  }
);

/**
 * Legacy Listen-and-Repeat audio submission.
 *
 * Session 4 is now Sentence Correction, so
 * candidate audio responses are no longer supported.
 */
export const submit = asyncHandler(
  async (req: Request, _res: Response) => {
    if (!req.file) {
      throw ApiError.badRequest(
        "No audio uploaded — expected multipart field 'audio'"
      );
    }

    const candidateId =
      await getCandidateIdForUser(
        req.user!.id
      );

    await audioService.submitAudioResponse({
      candidateId,
      sessionId: req.params.sessionId!,
      questionId: req.params.questionId!,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
    });
  }
);