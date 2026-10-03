import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import type { CreateJobRoleInput, UpdateJobRoleInput } from "./jobRole.validation";

export async function createJobRole(input: CreateJobRoleInput) {
  return prisma.jobRole.create({
    data: {
      title: input.title,
      description: input.description,
      requirements: input.requirements,
    },
  });
}

export async function listJobRoles() {
  // Deliberately unauthenticated-readable (see routes) — a candidate needs
  // to see this list to pick a role *before* they've registered.
  return prisma.jobRole.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getJobRole(id: string) {
  const role = await prisma.jobRole.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound("Job role not found");
  return role;
}

export async function updateJobRole(id: string, input: UpdateJobRoleInput) {
  await getJobRole(id); // 404s cleanly instead of a Prisma "record not found" throw
  return prisma.jobRole.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.requirements !== undefined && { requirements: input.requirements }),
    },
  });
}
