import { z } from "zod";

export const runOrSubmitSchema = z.object({
  codingQuestionId: z.string().min(1),
  language: z.enum(["PYTHON", "C", "CPP", "JAVA"]),
  sourceCode: z.string().min(1).max(50_000),
});
export type RunOrSubmitInput = z.infer<typeof runOrSubmitSchema>;

export const saveDraftSchema = z.object({
  language: z.enum(["PYTHON", "C", "CPP", "JAVA"]),
  sourceCode: z.string().max(50_000),
});
export type SaveDraftInput = z.infer<typeof saveDraftSchema>;