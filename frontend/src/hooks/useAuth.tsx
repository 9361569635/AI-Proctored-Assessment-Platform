import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
import * as authService from "../services/auth.service";
import { ApiClientError } from "../services/apiClient";

interface AuthContextValue {
  user: AuthUser | null;
  /** True only while the initial session check (on app load) is in flight. */
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .fetchMe()
      .then(({ user }) => setUser(user))
      .catch((err) => {
        // 401 here just means "not logged in yet" — not an error to surface.
        if (!(err instanceof ApiClientError) || err.status !== 401) {
          console.error("Failed to load session", err);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { user } = await authService.login(payload);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const { user } = await authService.registerCandidate(payload);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
