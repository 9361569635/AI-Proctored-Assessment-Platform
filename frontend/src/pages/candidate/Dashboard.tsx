import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CandidateLayout } from "../../layouts/CandidateLayout";
import { ResumeUpload, type ResumeAnalysisStatus } from "../../components/ResumeUpload";
import { useAuth } from "../../hooks/useAuth";
import * as assessmentService from "../../services/assessment.service";
import type { AssessmentStatusResponse } from "../../types/assessment";

export function CandidateDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<AssessmentStatusResponse | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<ResumeAnalysisStatus>("idle");

  useEffect(() => {
    assessmentService.getStatus().then(setStatus).catch(() => setStatus({ status: "NOT_STARTED" }));
  }, []);

  return (
    <CandidateLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user?.name}</h1>
          <p className="text-sm text-slate-500">Upload your resume to get started.</p>
        </div>

        <ResumeUpload onStatusChange={setAnalysisStatus} />

        <AssessmentEntryCard
          status={status}
          analysisStatus={analysisStatus}
          onStart={() => navigate("/candidate/system-check")}
          onResume={() => navigate("/candidate/assessment")}
          onViewResult={() => navigate("/candidate/result")}
        />
      </div>
    </CandidateLayout>
  );
}

function AssessmentEntryCard({
  status,
  analysisStatus,
  onStart,
  onResume,
  onViewResult,
}: {
  status: AssessmentStatusResponse | null;
  analysisStatus: ResumeAnalysisStatus;
  onStart: () => void;
  onResume: () => void;
  onViewResult: () => void;
}) {
  if (!status) return null;

  if (status.status === "IN_PROGRESS") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-semibold text-slate-900">Assessment in progress</h2>
        <p className="mb-4 text-sm text-slate-500">Pick up where you left off.</p>
        <button onClick={onResume} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Resume Assessment
        </button>
      </div>
    );
  }

  if (status.status === "COMPLETED" || status.status === "TERMINATED" || status.status === "EXPIRED") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-1 font-semibold text-slate-900">Assessment submitted</h2>
        <p className="mb-4 text-sm text-slate-500">Your result will be available 48 hours after completion.</p>
        <button onClick={onViewResult} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          View Result
        </button>
      </div>
    );
  }

  if (analysisStatus !== "completed") return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-1 font-semibold text-slate-900">Ready to Take Assessment</h2>
      <p className="mb-4 text-sm text-slate-500">
        It takes up to 2 hours 15 minutes. Make sure you have a working camera and microphone before you start.
      </p>
      <button onClick={onStart} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
        Start
      </button>
    </div>
  );
}
