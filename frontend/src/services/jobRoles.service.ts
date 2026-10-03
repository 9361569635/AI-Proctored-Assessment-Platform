import { apiFetch } from "./apiClient";
import type { JobRole, JobRoleRequirements } from "../types/jobRole";

export const listJobRoles = () => apiFetch<{ jobRoles: JobRole[] }>("/job-roles");

export const createJobRole = (payload: { title: string; description: string; requirements: JobRoleRequirements }) =>
  apiFetch<{ jobRole: JobRole }>("/job-roles", { method: "POST", body: payload });
