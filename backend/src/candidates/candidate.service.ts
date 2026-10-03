import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

/**
 * User.id (the JWT subject) and Candidate.id are different ids — every
 * candidate-facing module needs this lookup before it can query
 * candidate-scoped data. Centralized here so it's one place to change if
 * the relationship ever does (and one place that guarantees a MANAGEMENT/
 * SUPER_ADMIN user, who has no Candidate row, gets a clean 403 instead of
 * a confusing null-pointer deeper in a service).
 */
export async function getCandidateIdForUser(userId: string): Promise<string> {
  const candidate = await prisma.candidate.findUnique({ where: { userId }, select: { id: true } });
  if (!candidate) {
    throw ApiError.forbidden("This action requires a candidate account");
  }
  return candidate.id;
}

/**
 * Stores the candidate's pre-assessment verification photo directly on
 * their row as bytes (photoData/photoMimeType), rather than going through
 * the file-storage provider used elsewhere (e.g. AudioResponse's
 * audioFilePath) — this is a single small JPEG per candidate that gets
 * replaced on retake, not a growing collection of files, so keeping it
 * inline in Postgres is the simpler fit here.
 */
export async function saveCandidatePhoto(candidateId: string, buffer: Buffer, mimeType: string): Promise<void> {
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { photoData: buffer, photoMimeType: mimeType },
  });
}

/** Returns null if the candidate hasn't captured a photo yet. */
export async function getCandidatePhoto(candidateId: string): Promise<{ data: Buffer; mimeType: string } | null> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { photoData: true, photoMimeType: true },
  });
  if (!candidate?.photoData || !candidate.photoMimeType) return null;
  return { data: candidate.photoData, mimeType: candidate.photoMimeType };
}