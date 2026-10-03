import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type CheckStatus = "pending" | "checking" | "pass" | "fail";
interface CheckItem {
  key: string;
  label: string;
  status: CheckStatus;
  detail?: string;
}

const INITIAL_CHECKS: CheckItem[] = [
  { key: "internet", label: "Internet connection", status: "pending" },
  { key: "browser", label: "Browser compatibility", status: "pending" },
  { key: "fullscreen", label: "Full-screen support", status: "pending" },
  { key: "camera", label: "Camera access", status: "pending" },
  { key: "microphone", label: "Microphone access", status: "pending" },
];

export function SystemCheckPage() {
  const navigate = useNavigate();
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS);

  const update = (key: string, status: CheckStatus, detail?: string) =>
    setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, status, detail } : c)));

  useEffect(() => {
    update("internet", navigator.onLine ? "pass" : "fail", navigator.onLine ? undefined : "No internet connection detected.");

    const browserOk = !!navigator.mediaDevices?.getUserMedia;
    update("browser", browserOk ? "pass" : "fail", browserOk ? undefined : "Please use a recent Chrome, Edge, or Firefox.");

    update("fullscreen", "pass");

    update("camera", "checking");
    navigator.mediaDevices
      ?.getUserMedia({ video: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        update("camera", "pass");
      })
      .catch(() => update("camera", "fail", "Camera permission was denied or no camera was found."));

    update("microphone", "checking");
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        update("microphone", "pass");
      })
      .catch(() => update("microphone", "fail", "Microphone permission was denied or no microphone was found."));
  }, []);

  const allPass = checks.every((c) => c.status === "pass");

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">System compatibility check</h1>
          <p className="mt-1 text-sm text-slate-500">All checks must pass before you can start the assessment.</p>
        </div>

        <ul className="space-y-3">
          {checks.map((c) => (
            <li key={c.key} className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-700">{c.label}</p>
                {c.detail && <p className="text-xs text-red-600">{c.detail}</p>}
              </div>
              <StatusBadge status={c.status} />
            </li>
          ))}
        </ul>

        <button
          disabled={!allPass}
          onClick={() => navigate("/candidate/consent")}
          className="w-full rounded-md bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const styles: Record<CheckStatus, string> = {
    pending: "bg-slate-100 text-slate-500",
    checking: "bg-amber-100 text-amber-700",
    pass: "bg-emerald-100 text-emerald-700",
    fail: "bg-red-100 text-red-700",
  };
  const label: Record<CheckStatus, string> = { pending: "…", checking: "Checking", pass: "OK", fail: "Failed" };
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{label[status]}</span>;
}
