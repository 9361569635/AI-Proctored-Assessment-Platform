import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { listJobRoles } from "../../services/jobRoles.service";
import { ApiClientError } from "../../services/apiClient";
import type { JobRole } from "../../types/jobRole";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [jobRoleId, setJobRoleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listJobRoles()
      .then(({ jobRoles }) => {
        setJobRoles(jobRoles);
        if (jobRoles[0]) setJobRoleId(jobRoles[0].id);
      })
      .catch(() => setError("Couldn't load job roles. Is the backend running?"));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ fullName, email, mobileNumber, password, confirmPassword, jobRoleId });
      navigate("/candidate");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create your candidate account</h1>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Field label="Full name">
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Email">
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mobile number">
          <input required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Job role">
          {jobRoles.length === 0 ? (
            <p className="text-sm text-slate-500">
              No job roles yet — a management user needs to create one first (POST /api/job-roles).
            </p>
          ) : (
            <select required value={jobRoleId} onChange={(e) => setJobRoleId(e.target.value)} className={inputClass}>
              {jobRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Password">
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Confirm password">
          <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} />
        </Field>

        <button
          type="submit"
          disabled={submitting || jobRoles.length === 0}
          className="w-full rounded-md bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {submitting ? "Creating account…" : "Register"}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-slate-900 underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
