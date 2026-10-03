import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as assessmentService from "../../services/assessment.service";
import { ApiClientError } from "../../services/apiClient";
import { GeneralAssessmentInstructions } from "../../components/assessment/SessionInstructionsPanel";
import { PhotoCapture } from "../../components/PhotoCapture";

const DISCLOSURES = [
  "The assessment takes up to 2 hours 15 minutes, with a server-controlled timer.",
  "Your webcam and microphone will be monitored for the duration of the assessment.",
  "Your responses, code, and resume will be analyzed by AI to assist evaluation.",
  "Copying, pasting, and switching away from this browser tab are restricted and logged.",
  "Your final result will be available 48 hours after you complete the assessment.",
];

export function ConsentPage() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = agreed && photoCaptured;

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    const fullscreenRequest = document.documentElement.requestFullscreen().catch(() => {
      // Best-effort — see comment below in the source for why a rejection is not fatal.
    });
    try {
      await assessmentService.startAssessment();
      await fullscreenRequest;
      navigate("/candidate/assessment");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't start the assessment");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-3">
        {/* Left: photo verification */}
        <PhotoCapture onCaptured={setPhotoCaptured} />

        {/* Center: general instructions */}
        <GeneralAssessmentInstructions />

        {/* Right: start assessment */}
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Before you begin</h1>
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {DISCLOSURES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>I have read and agree to the above, including AI analysis and monitoring during the assessment.</span>
          </label>

          <button
            disabled={!canStart || starting}
            onClick={handleStart}
            className="w-full rounded-md bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start Assessment"}
          </button>
          {!photoCaptured && (
            <p className="text-center text-xs text-slate-500">Capture your photo on the left before you can start.</p>
          )}
        </div>
      </div>
    </div>
  );
}