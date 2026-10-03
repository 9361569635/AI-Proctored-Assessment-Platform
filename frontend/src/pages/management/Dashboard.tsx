import { useEffect, useState } from "react";
import { ManagementLayout } from "../../layouts/ManagementLayout";
import * as managementService from "../../services/management.service";
import type { DashboardResponse } from "../../types/management";

const CARD_LABELS: Array<[keyof DashboardResponse["cards"], string]> = [
  ["totalCandidates", "Total Candidates"],
  ["assessmentStarted", "Assessment Started"],
  ["assessmentCompleted", "Assessment Completed"],
  ["eligible", "Eligible"],
  ["notEligible", "Not Eligible"],
  ["shortlisted", "Shortlisted"],
  ["rejected", "Rejected"],
  ["underReview", "Under Review"],
  ["proctoringViolations", "Proctoring Violations"],
];

export function ManagementDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    managementService.getDashboard().then(setData).catch(() => setData(null));
  }, []);

  if (!data) {
    return (
      <ManagementLayout>
        <p className="text-sm text-slate-500">Loading…</p>
      </ManagementLayout>
    );
  }

  return (
    <ManagementLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CARD_LABELS.map(([key, label]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-semibold text-slate-900">{data.cards[key]}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-medium text-slate-700">Average overall score</p>
            <p className="text-3xl font-semibold text-slate-900">{data.charts.averageScore.toFixed(1)}/100</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-medium text-slate-700">Session averages</p>
            <ul className="space-y-1 text-sm text-slate-600">
              {Object.entries(data.charts.sessionPerformance).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-slate-100 py-1 last:border-0">
                  <span className="capitalize">{k}</span>
                  <span>{v.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2">
            <p className="mb-3 text-sm font-medium text-slate-700">Coding averages</p>
            <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
              {Object.entries(data.charts.codingPerformance).map(([k, v]) => (
                <div key={k} className="rounded bg-slate-50 p-3 text-center">
                  <p className="text-xs capitalize text-slate-500">{k}</p>
                  <p className="text-lg font-medium text-slate-900">{v.toFixed(1)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ManagementLayout>
  );
}
