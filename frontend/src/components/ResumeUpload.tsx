import { useEffect, useState } from "react";
import * as resumeService from "../services/resume.service";
import { ApiClientError } from "../services/apiClient";
import type { MyResume } from "../types/resume";

export type ResumeAnalysisStatus = "idle" | "analyzing" | "completed" | "failed";

export function ResumeUpload({
  onStatusChange,
}: {
  onStatusChange?: (status: ResumeAnalysisStatus, resume: MyResume | null) => void;
}) {
  const [resume, setResume] = useState<MyResume | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resumeService
      .getMyResume()
      .then(({ resume }) => {
        setResume(resume);
        onStatusChange?.(resume.skills.length > 0 ? "completed" : "idle", resume);
      })
      .catch(() => {
        onStatusChange?.("idle", null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setError(null);
    try {
      setStatus("uploading");
      onStatusChange?.("analyzing", null);
      await resumeService.uploadResume(file);
      setStatus("analyzing");
      const { parsedData } = await resumeService.analyzeResume();
      const { resume } = await resumeService.getMyResume();
      setResume(resume);
      void parsedData;
      setStatus("idle");
      if (resume.skills.length > 0) {
        onStatusChange?.("completed", resume);
      } else {
        onStatusChange?.("failed", null);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Resume upload failed");
      setStatus("error");
      onStatusChange?.("failed", null);
    }
  };

  const isBusy = status === "uploading" || status === "analyzing";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Resume</h2>

      <div className="flex items-center gap-3">
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={isBusy}
          className="text-sm"
        />
        <button
          onClick={handleUpload}
          disabled={!file || isBusy}
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {status === "uploading" ? "Uploading…" : status === "analyzing" ? "Analyzing…" : "Upload & Analyze"}
        </button>
      </div>

      {status === "uploading" && <p className="text-sm text-slate-600">Analyzing Resume…</p>}
      {status === "analyzing" && <p className="text-sm text-slate-600">Extracting Skills…</p>}

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {resume && "skills" in resume && resume.skills.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Extracted skills</p>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map((s) => (
              <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                {s.skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {resume?.matchResult && (
        <div className="rounded-md bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">
            Match with your selected job role: <span className="font-semibold">{resume.matchResult.resumeRelevance}</span>
          </p>
          {resume.matchResult.missingSkills.length > 0 && (
            <p className="mt-1 text-xs text-slate-500">
              Skills the role asks for that weren't found on your resume: {resume.matchResult.missingSkills.join(", ")}
            </p>
          )}
        </div>
      )}

      {resume && !isBusy && !("skills" in resume && resume.skills.length > 0) && (
        <p className="text-sm text-slate-500">
          Uploaded — analysis pending or found no recognizable skills. Press "Upload & Analyze" to retry.
        </p>
      )}
    </div>
  );
}
