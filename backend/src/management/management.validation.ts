import { z } from "zod";

export const createManagementUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  permissions: z.array(z.string()).default([]),
});
export type CreateManagementUserInput = z.infer<typeof createManagementUserSchema>;

export const listCandidatesQuerySchema = z.object({
  jobRoleId: z.string().optional(),
  eligibility: z.enum(["ELIGIBLE", "NOT_ELIGIBLE"]).optional(),
  finalStatus: z.enum(["PENDING", "SHORTLISTED", "NOT_SHORTLISTED", "UNDER_REVIEW", "REJECTED"]).optional(),
  search: z.string().optional(),
});
export type ListCandidatesQuery = z.infer<typeof listCandidatesQuerySchema>;

export const updateShortlistSchema = z.object({
  category: z.enum(["STRONGLY_RECOMMENDED", "RECOMMENDED", "CONSIDER", "UNDER_REVIEW", "NOT_SHORTLISTED", "REJECTED"]).optional(),
  finalStatus: z.enum(["UNDER_REVIEW", "SHORTLISTED", "NOT_SHORTLISTED"]).optional(),
  comment: z.string().max(2000).optional(),
});
export type UpdateShortlistInput = z.infer<typeof updateShortlistSchema>;
