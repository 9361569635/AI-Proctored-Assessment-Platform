import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ManagementLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold text-slate-900">AI Assessment Platform</span>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link to="/management" className="hover:text-slate-900">
                Dashboard
              </Link>
              <Link to="/management/candidates" className="hover:text-slate-900">
                Candidates
              </Link>
              <Link to="/management/job-roles" className="hover:text-slate-900">
                Job Roles
              </Link>
              <Link to="/management/coding-questions" className="hover:text-slate-900">
                Coding Questions
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>
              {user?.name} · {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Management"}
            </span>
            <button onClick={handleLogout} className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
