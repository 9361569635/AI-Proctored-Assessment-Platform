import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ManagementLayout } from "../../layouts/ManagementLayout";
import * as managementService from "../../services/management.service";
import type { CandidateListItem } from "../../types/management";

const ELIGIBILITY_OPTIONS = ["", "ELIGIBLE", "NOT_ELIGIBLE"];
const STATUS_OPTIONS = ["", "PENDING", "SHORTLISTED", "NOT_SHORTLISTED", "UNDER_REVIEW", "REJECTED"];
const COLUMNS = ["Name", "Job Role", "Resume Match", "Overall", "Aptitude", "Logical", "Reasoning", "Comm.", "Grammar", "Coding", "Eligibility", "Status", "Date"];

export function ManagementCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [search, setSearch] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [finalStatus, setFinalStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    managementService
      .listCandidates({ search: search || undefined, eligibility: eligibility || undefined, finalStatus: finalStatus || undefined })
      .then(({ candidates }) => setCandidates(candidates))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ManagementLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Candidates</h1>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email, phone"
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Eligibility</span>
            <select value={eligibility} onChange={(e) => setEligibility(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              {ELIGIBILITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || "All"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-slate-500">Status</span>
            <select value={finalStatus} onChange={(e) => setFinalStatus(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
              {STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o || "All"}
                </option>
              ))}
            </select>
          </label>
          <button onClick={load} className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
            Filter
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {COLUMNS.map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.candidateId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link to={`/management/candidates/${c.candidateId}`} className="font-medium text-slate-900 hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </td>
                  <td className="px-3 py-2">{c.jobRole}</td>
                  <td className="px-3 py-2">{c.resumeMatch ?? "—"}</td>
                  <td className="px-3 py-2">{c.overallScore ?? "—"}</td>
                  <td className="px-3 py-2">{c.aptitude ?? "—"}</td>
                  <td className="px-3 py-2">{c.logical ?? "—"}</td>
                  <td className="px-3 py-2">{c.reasoning ?? "—"}</td>
                  <td className="px-3 py-2">{c.communication ?? "—"}</td>
                  <td className="px-3 py-2">{c.grammar ?? "—"}</td>
                  <td className="px-3 py-2">{c.coding ?? "—"}</td>
                  <td className="px-3 py-2">{c.eligibility}</td>
                  <td className="px-3 py-2">{c.shortlistStatus}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                    {c.assessmentDate ? new Date(c.assessmentDate).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
              {!loading && candidates.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-slate-500">
                    No candidates match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ManagementLayout>
  );
}
