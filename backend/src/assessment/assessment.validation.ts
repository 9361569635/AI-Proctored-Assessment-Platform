import { z } from "zod";

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().trim().min(1).max(2000),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
