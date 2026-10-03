import type { Request, Response } from "express";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as candidateService from "./candidate.service";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const photoUploadMiddleware = upload.single("photo");

const SUPPORTED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** POST /api/candidate/photo — stores the pre-assessment verification photo. */
export const uploadPhoto = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("No photo uploaded — expected multipart field 'photo'");
  }
  if (req.file.size === 0) {
    throw ApiError.badRequest("Photo is empty");
  }
  if (!SUPPORTED_PHOTO_MIME_TYPES.includes(req.file.mimetype)) {
    throw ApiError.badRequest("Unsupported image format");
  }

  const candidateId = await candidateService.getCandidateIdForUser(req.user!.id);
  await candidateService.saveCandidatePhoto(candidateId, req.file.buffer, req.file.mimetype);
  res.status(200).json({ ok: true });
});

/** GET /api/candidate/photo — streams the stored photo back as image bytes. */
export const getPhoto = asyncHandler(async (req: Request, res: Response) => {
  const candidateId = await candidateService.getCandidateIdForUser(req.user!.id);
  const photo = await candidateService.getCandidatePhoto(candidateId);
  if (!photo) {
    throw ApiError.notFound("No photo has been captured yet");
  }
  res.setHeader("Content-Type", photo.mimeType);
  res.setHeader("Content-Length", photo.data.length.toString());
  // Private cache only — this is one specific candidate's own photo, not
  // something a shared cache (CDN/proxy) should ever store.
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.status(200).send(photo.data);
});