import fs from "node:fs";
import { ApiError } from "../utils/ApiError";

export const SUPPORTED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
] as const;

export async function extractTextFromResume(absolutePath: string, mimetype: string): Promise<string> {
  const buffer = fs.readFileSync(absolutePath);

  if (mimetype === "application/pdf") {
    // Lazy-required: pdf-parse reads a test fixture at import time in some
    // versions, which is unnecessary work for requests that upload a docx.
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === "application/msword") {
    // Legacy binary .doc has no reliable pure-JS parser; mammoth only
    // handles .docx. In production, shell out to `antiword`/`catdoc` or a
    // conversion service. Surfacing this as a clear 400 beats silently
    // returning empty/garbled text that AI extraction would then fail on.
    throw ApiError.badRequest(
      "Legacy .doc files aren't supported yet — please upload as .docx or .pdf."
    );
  }

  throw ApiError.badRequest("Unsupported resume file type");
}
