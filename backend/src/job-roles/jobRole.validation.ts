import { z } from "zod";

export const jobRoleRequirementsSchema = z.object({
  requiredSkills: z.array(z.string().trim().min(1)).default([]),
  preferredSkills: z.array(z.string().trim().min(1)).default([]),
  minExperienceYears: z.number().int().min(0).optional(),
});

export const createJobRoleSchema = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().min(10).max(10_000),
  requirements: jobRoleRequirementsSchema,
});
export type CreateJobRoleInput = z.infer<typeof createJobRoleSchema>;

export const updateJobRoleSchema = createJobRoleSchema.partial();
export type UpdateJobRoleInput = z.infer<typeof updateJobRoleSchema>;
