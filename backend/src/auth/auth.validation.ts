import { z } from "zod";

export const registerCandidateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    mobileNumber: z.string().trim().min(7).max(20),
    password: z.string().min(8).max(72),
    confirmPassword: z.string(),
    jobRoleId: z.string().cuid(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterCandidateInput = z.infer<typeof registerCandidateSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
