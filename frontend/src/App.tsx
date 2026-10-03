import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RegisterPage } from "./pages/auth/Register";
import { LoginPage } from "./pages/auth/Login";
import { CandidateDashboardPage } from "./pages/candidate/Dashboard";
import { SystemCheckPage } from "./pages/candidate/SystemCheck";
import { ConsentPage } from "./pages/candidate/Consent";
import { AssessmentRunnerPage } from "./pages/candidate/AssessmentRunner";
import { ResultPage } from "./pages/candidate/Result";
import { ManagementDashboardPage } from "./pages/management/Dashboard";
import { ManagementCandidatesPage } from "./pages/management/Candidates";
import { ManagementCandidateDetailPage } from "./pages/management/CandidateDetail";
import { ManagementJobRolesPage } from "./pages/management/JobRoles";
import { ManagementCodingQuestionsPage } from "./pages/management/CodingQuestions";

/** "/" used to always redirect to /candidate — now branches by the logged-in user's role. */
function RoleHome() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-500">Loading…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "CANDIDATE" ? "/candidate" : "/management"} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/candidate"
            element={
              <ProtectedRoute allow={["CANDIDATE"]}>
                <CandidateDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/system-check"
            element={
              <ProtectedRoute allow={["CANDIDATE"]}>
                <SystemCheckPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/consent"
            element={
              <ProtectedRoute allow={["CANDIDATE"]}>
                <ConsentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/assessment"
            element={
              <ProtectedRoute allow={["CANDIDATE"]}>
                <AssessmentRunnerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/candidate/result"
            element={
              <ProtectedRoute allow={["CANDIDATE"]}>
                <ResultPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/management"
            element={
              <ProtectedRoute allow={["MANAGEMENT", "SUPER_ADMIN"]}>
                <ManagementDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/candidates"
            element={
              <ProtectedRoute allow={["MANAGEMENT", "SUPER_ADMIN"]}>
                <ManagementCandidatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/candidates/:id"
            element={
              <ProtectedRoute allow={["MANAGEMENT", "SUPER_ADMIN"]}>
                <ManagementCandidateDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/job-roles"
            element={
              <ProtectedRoute allow={["MANAGEMENT", "SUPER_ADMIN"]}>
                <ManagementJobRolesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/management/coding-questions"
            element={
              <ProtectedRoute allow={["MANAGEMENT", "SUPER_ADMIN"]}>
                <ManagementCodingQuestionsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
