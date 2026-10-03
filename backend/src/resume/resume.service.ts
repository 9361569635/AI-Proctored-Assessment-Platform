import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { getStorageProvider } from "../storage";
import { getAIProvider, type MatchResult } from "../ai";
import { extractTextFromResume, SUPPORTED_RESUME_MIME_TYPES } from "./textExtraction";
import { logger } from "../utils/logger";

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

interface UploadInput {
  candidateId: string;
  buffer: Buffer;
  originalName: string;
  declaredMimetype: string;
}

/**
 * Validates file size + type by BOTH the declared mimetype (from the
 * upload) and the file's actual magic bytes (via `file-type`), so a
 * renamed/relabeled malicious file can't slip past a mimetype-only check
 * (spec §3: "Validate file type... Malicious upload").
 */
export async function uploadResume({ candidateId, buffer, originalName, declaredMimetype }: UploadInput) {
  if (buffer.length === 0) {
    throw ApiError.badRequest("Uploaded file is empty or corrupted");
  }
  if (buffer.length > MAX_RESUME_BYTES) {
    throw ApiError.badRequest("Resume file exceeds the 5MB limit");
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(buffer);

  // PDFs and DOCX are detectable by magic bytes; legacy .doc (OLE Compound
  // File) is detected as "application/x-cfb" by file-type's signature table,
  // so accept that specifically only when the declared type was .doc.
  const detectedMime = detected?.mime;
  const isPdfOk = detectedMime === "application/pdf" && declaredMimetype === "application/pdf";
  const isDocxOk =
    detectedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    declaredMimetype === detectedMime;
  const isLegacyDocOk = detectedMime === "application/x-cfb" && declaredMimetype === "application/msword";

  if (!isPdfOk && !isDocxOk && !isLegacyDocOk) {
    logger.warn("Resume upload rejected: content does not match a supported file type", {
      candidateId,
      declaredMimetype,
      detectedMime,
    });
    throw ApiError.badRequest(
      "File content doesn't match a supported resume format (PDF, DOC, DOCX). It may be corrupted or mislabeled."
    );
  }
  if (!SUPPORTED_RESUME_MIME_TYPES.includes(declaredMimetype as (typeof SUPPORTED_RESUME_MIME_TYPES)[number])) {
    throw ApiError.badRequest("Unsupported resume file type");
  }

  const storage = getStorageProvider();
  const saved = await storage.save({ buffer, originalName, subfolder: "resumes" });

  const extractedText = await extractTextFromResume(storage.readAbsolutePath(saved.storagePath), declaredMimetype);
  if (extractedText.trim().length < 20) {
    throw ApiError.badRequest("Couldn't extract readable text from this resume — please try a different file.");
  }

  // Resume is 1:1 with Candidate — replace on re-upload rather than erroring,
  // so a candidate can fix a bad upload before starting their assessment.
  const resume = await prisma.resume.upsert({
    where: { candidateId },
    update: { filePath: saved.storagePath, extractedText, parsedData: {}, matchResult: Prisma.DbNull },
    create: { candidateId, filePath: saved.storagePath, extractedText, parsedData: {} },
  });

  return resume;
}

export async function analyzeResume(candidateId: string) {
  const resume = await prisma.resume.findUnique({ where: { candidateId } });
  if (!resume) {
    throw ApiError.notFound("Upload a resume before requesting analysis");
  }

  const candidate = await prisma.candidate.findUniqueOrThrow({
    where: { id: candidateId },
    include: { jobRole: true },
  });

  const ai = getAIProvider();
  const parsed = await ai.extractResume(resume.extractedText);

  // Resume↔JD matching (spec §5) is a secondary enrichment on top of
  // extraction — if it fails (e.g. a transient AI error), don't block the
  // extraction result the candidate is actually waiting on for.
  let matchResult: MatchResult | null = null;
  try {
    const requirements = candidate.jobRole.requirements as
      | { requiredSkills?: string[]; preferredSkills?: string[] }
      | null;
    matchResult = await ai.matchJobDescription(parsed, {
      title: candidate.jobRole.title,
      description: candidate.jobRole.description,
      requiredSkills: requirements?.requiredSkills ?? [],
      preferredSkills: requirements?.preferredSkills ?? [],
    });
  } catch (err) {
    logger.error("Job description matching failed", {
      candidateId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const [updatedResume] = await prisma.$transaction([
    prisma.resume.update({
      where: { candidateId },
      data: {
        parsedData: parsed as unknown as object,
        matchResult: matchResult ? (matchResult as unknown as object) : Prisma.DbNull,
      },
    }),
    prisma.skill.deleteMany({ where: { candidateId } }),
  ]);

  const skillNames = Array.from(
    new Set([...parsed.skills, ...parsed.technicalSkills, ...parsed.programmingLanguages])
  );
  if (skillNames.length > 0) {
    await prisma.skill.createMany({
      data: skillNames.map((skill) => ({ candidateId, skill })),
    });
  }

  return { resume: updatedResume, parsed, matchResult };
}

export async function getMyResume(candidateId: string) {
  const resume = await prisma.resume.findUnique({
    where: { candidateId },
    include: { candidate: { include: { skills: true } } },
  });
  if (!resume) {
    throw ApiError.notFound("No resume on file");
  }
  return resume;
}
