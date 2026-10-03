import { apiFetch } from "./apiClient";
import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";

export const registerCandidate = (payload: RegisterPayload) =>
  apiFetch<{ user: AuthUser }>("/auth/register", { method: "POST", body: payload });

export const login = (payload: LoginPayload) =>
  apiFetch<{ user: AuthUser }>("/auth/login", { method: "POST", body: payload });

export const logout = () => apiFetch<void>("/auth/logout", { method: "POST" });

export const fetchMe = () => apiFetch<{ user: AuthUser }>("/auth/me");
