import type { Request, Response } from "express";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { getCandidateIdForUser } from "../candidates/candidate.service";
import * as resumeService from "./resume.service";

// Buffered in memory (files are capped at 5MB in the service layer) rather
// than written straight to disk by multer, so uploadResume() can run the
// magic-byte check before anything touches the filesystem.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const resumeUploadMiddleware = upload.single("resume");

export const uploadHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("No file uploaded — expected multipart field 'resume'");
  }
  const candidateId = await getCandidateIdForUser(req.user!.id);
  const resume = await resumeService.uploadResume({
    candidateId,
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    declaredMimetype: req.file.mimetype,
  });
  res.status(201).json({
    resume: { id: resume.id, uploadedAt: resume.uploadedAt, hasExtractedText: resume.extractedText.length > 0 },
  });
});

export const analyzeHandler = asyncHandler(async (req: Request, res: Response) => {
  const candidateId = await getCandidateIdForUser(req.user!.id);
  const { resume, parsed, matchResult } = await resumeService.analyzeResume(candidateId);
  res.status(200).json({ resumeId: resume.id, parsedData: parsed, matchResult });
});

export const getMyResumeHandler = asyncHandler(async (req: Request, res: Response) => {
  const candidateId = await getCandidateIdForUser(req.user!.id);
  const resume = await resumeService.getMyResume(candidateId);
  res.status(200).json({
    resume: {
      id: resume.id,
      uploadedAt: resume.uploadedAt,
      parsedData: resume.parsedData,
      matchResult: resume.matchResult,
      skills: resume.candidate.skills,
    },
  });
});
