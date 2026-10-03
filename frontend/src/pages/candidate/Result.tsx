import { useEffect, useState } from "react";
import { CandidateLayout } from "../../layouts/CandidateLayout";
import * as assessmentService from "../../services/assessment.service";
import { ApiClientError } from "../../services/apiClient";
import type { AssessmentResultResponse } from "../../types/assessment";

export function ResultPage() {
  const [result, setResult] = useState<AssessmentResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    assessmentService
      .getResult()
      .then(setResult)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Couldn't load your result"));
  }, []);

  // If this page loaded inside the secure-exam-desktop shell, the candidate
  // has finished — release the kiosk lock (exit fullscreen, re-enable the
  // window's close button) so they can read this result and close the app
  // in their own time, instead of being stuck in a locked kiosk window.
  useEffect(() => {
    if (result?.status === "released" || result?.status === "under_review") {
      window.secureExamDesktop?.requestExit("assessment_complete");
    }
  }, [result]);

  return (
    <CandidateLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Assessment Result</h1>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {!result && !error && <p className="text-sm text-slate-500">Loading…</p>}

        {result?.status === "under_review" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-sm text-slate-700">{result.message}</p>
            {result.resultAvailableAt && (
              <p className="mt-2 text-xs text-slate-500">
                Available from {new Date(result.resultAvailableAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {result?.status === "released" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">Overall score</p>
              <p className="text-3xl font-semibold text-slate-900">{result.overallScore ?? 0}/100</p>
              <p className="mt-2 text-sm text-slate-700">
                Eligibility: <span className="font-medium">{result.eligibility}</span> · Status:{" "}
                <span className="font-medium">{result.finalStatus}</span>
                {result.category && <> · {result.category}</>}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="mb-3 text-sm font-medium text-slate-700">Session breakdown</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {result.sessionScores.map((s) => (
                  <li key={s.sessionType} className="flex justify-between border-b border-slate-100 py-1 last:border-0">
                    <span>{s.sessionType}</span>
                    <span>{s.score ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </CandidateLayout>
  );
}
