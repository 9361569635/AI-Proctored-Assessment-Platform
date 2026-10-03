import { z } from "zod";

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  isHidden: z.boolean(),
});

export const createCodingQuestionSchema = z
  .object({
    session: z.enum(["EASY_CODING", "MODERATE_CODING", "HARD_CODING"]),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10),
    difficulty: z.enum(["EASY", "MODERATE", "HARD"]),
    marks: z.number().int().positive(),
    testCases: z.array(testCaseSchema).length(15, "Every coding question needs exactly 15 test cases (10 visible + 5 hidden) — spec §13/§19/§20"),
  })
  .refine((data) => data.testCases.filter((t) => !t.isHidden).length === 10, {
    message: "Exactly 10 test cases must have isHidden: false",
    path: ["testCases"],
  })
  .refine((data) => data.testCases.filter((t) => t.isHidden).length === 5, {
    message: "Exactly 5 test cases must have isHidden: true",
    path: ["testCases"],
  });

export type CreateCodingQuestionInput = z.infer<typeof createCodingQuestionSchema>;
