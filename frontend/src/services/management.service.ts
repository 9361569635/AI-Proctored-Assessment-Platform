import { apiFetch } from "./apiClient";
import type { DashboardResponse, CandidateListItem, CandidateDetailResponse } from "../types/management";

export const getDashboard = () => apiFetch<DashboardResponse>("/management/dashboard");

export interface CandidateFilters {
  jobRoleId?: string;
  eligibility?: string;
  finalStatus?: string;
  search?: string;
}

export const listCandidates = (filters: CandidateFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const qs = params.toString();
  return apiFetch<{ candidates: CandidateListItem[] }>(`/management/candidates${qs ? `?${qs}` : ""}`);
};

export const getCandidate = (id: string) => apiFetch<CandidateDetailResponse>(`/management/candidates/${id}`);

export const updateShortlist = (id: string, body: { category?: string; finalStatus?: string; comment?: string }) =>
  apiFetch<{ shortlisting: unknown }>(`/management/candidates/${id}/status`, { method: "PUT", body });
