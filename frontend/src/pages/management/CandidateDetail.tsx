import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ManagementLayout } from "../../layouts/ManagementLayout";
import * as managementService from "../../services/management.service";
import { ApiClientError } from "../../services/apiClient";
import type { CandidateDetailResponse } from "../../types/management";

const CATEGORY_OPTIONS = ["STRONGLY_RECOMMENDED", "RECOMMENDED", "CONSIDER", "UNDER_REVIEW", "NOT_SHORTLISTED", "REJECTED"];
const STATUS_OPTIONS = ["PENDING", "SHORTLISTED", "NOT_SHORTLISTED", "UNDER_REVIEW", "REJECTED"];

export function ManagementCandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CandidateDetailResponse | null>(null);
  const [category, setCategory] = useState("");
  const [finalStatus, setFinalStatus] = useState("PENDING");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!id) return;
    managementService.getCandidate(id).then((d) => {
      setDetail(d);
      setCategory(d.shortlisting?.category ?? "");
      setFinalStatus(d.shortlisting?.finalStatus ?? "PENDING");
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      await managementService.updateShortlist(id, {
        category: category || undefined,
        finalStatus: finalStatus || undefined,
        comment: comment || undefined,
      });
      setComment("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save this decision");
    } finally {
      setSaving(false);
    }
  };

  if (!detail) {
    return (
      <ManagementLayout>
        <p className="text-sm text-slate-500">Loading…</p>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{detail.candidate.name}</h1>
          <p className="text-sm text-slate-500">
            {detail.candidate.email} · {detail.candidate.phone} · {detail.candidate.jobRole}
          </p>
        </div>

        {detail.assessment ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-3 text-sm font-medium text-slate-700">Assessment</p>
            <p className="mb-1 text-3xl font-semibold text-slate-900">{detail.assessment.totalScore ?? 0}/100</p>
            <p className="mb-4 text-sm text-slate-600">
              Status: {detail.assessment.status} · Eligibility: {detail.assessment.eligibility}
            </p>
            <div className="grid grid-cols-4 gap-2 text-sm sm:grid-cols-8">
              {detail.assessment.sessions.map((s) => (
                <div key={s.sessionType} className="rounded bg-slate-50 p-2 text-center">
                  <p className="text-xs text-slate-500">{s.sessionType.replace("_", " ")}</p>
                  <p className="font-medium text-slate-900">{s.score ?? "—"}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            This candidate hasn't started an assessment yet.
          </div>
        )}

        {detail.resume && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Resume</p>
              {detail.resume.matchResult && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  Job match: {detail.resume.matchResult.resumeRelevance}
                </span>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {detail.resume.skills.map((s) => (
                <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {s.skill}
                </span>
              ))}
            </div>
            {detail.resume.matchResult && detail.resume.matchResult.missingSkills.length > 0 && (
              <p className="text-xs text-slate-500">
                Missing required skills: {detail.resume.matchResult.missingSkills.join(", ")}
              </p>
            )}
          </div>
        )}

        {detail.codingSubmissions.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <p className="mb-3 text-sm font-medium text-slate-700">Coding submissions</p>
            <div className="space-y-3">
              {detail.codingSubmissions.map((s, i) => (
                <div key={i} className="rounded border border-slate-100 p-3 text-sm">
                  <p className="font-medium text-slate-900">
                    {s.question} <span className="font-normal text-slate-500">({s.language ?? "not attempted"})</span>
                  </p>
                  <p className="text-slate-600">
                    {s.passedTests ?? 0}/{s.totalTests ?? 0} test cases passed · {s.marks} marks
                    {s.executionTimeMs !== null && ` · ${s.executionTimeMs}ms`}
                    {s.memoryUsageKb !== null && ` · ${s.memoryUsageKb}KB`}
                  </p>
                  {s.compileError && <pre className="mt-1 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-700">{s.compileError}</pre>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Proctoring</p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                detail.proctoring.riskLevel === "Critical" || detail.proctoring.riskLevel === "High"
                  ? "bg-red-100 text-red-700"
                  : detail.proctoring.riskLevel === "Medium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {detail.proctoring.riskLevel} risk
            </span>
          </div>
          <p className="mb-3 text-sm text-slate-600">{detail.proctoring.totalViolations} violation(s) recorded</p>
          {detail.proctoring.events.length > 0 ? (
            <div className="max-h-48 space-y-1 overflow-y-auto text-xs text-slate-500">
              {detail.proctoring.events.map((e, i) => (
                <div key={i} className="flex justify-between border-b border-slate-100 py-1 last:border-0">
                  <span>
                    {e.eventType} <span className="text-slate-400">({e.severity})</span>
                  </span>
                  <span>{new Date(e.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No events recorded.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-2 text-sm font-medium text-slate-700">AI recommendation</p>
          {detail.aiRecommendation ? (
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">{detail.aiRecommendation.recommendation}</p>
              <p className="text-sm text-slate-600">{detail.aiRecommendation.reason}</p>
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span>Technical skills: {detail.aiRecommendation.technicalSkills}</span>
                <span>Problem solving: {detail.aiRecommendation.problemSolving}</span>
                <span>Resume match: {detail.aiRecommendation.resumeMatch}</span>
                <span>Proctoring risk: {detail.aiRecommendation.proctoringRisk}</span>
              </div>
              <p className="text-xs text-slate-400">
                Advisory only — this is AI input for your review, not a decision. You have final authority.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Not available yet — this candidate hasn't finished an assessment, or the analysis couldn't be generated.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="mb-3 text-sm font-medium text-slate-700">Shortlisting decision</p>
          {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                <option value="">—</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Final status</span>
              <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                {STATUS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[16rem] flex-1 text-sm">
              <span className="mb-1 block text-xs text-slate-500">Comment</span>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                placeholder="Reason for this decision (optional)"
              />
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          {detail.shortlisting?.managementComment && (
            <p className="mt-3 text-xs text-slate-500">Last comment: {detail.shortlisting.managementComment}</p>
          )}
        </div>
      </div>
    </ManagementLayout>
  );
}
