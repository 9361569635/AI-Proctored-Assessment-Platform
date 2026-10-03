import { useEffect, useState, type FormEvent } from "react";
import { ManagementLayout } from "../../layouts/ManagementLayout";
import * as jobRolesService from "../../services/jobRoles.service";
import { ApiClientError } from "../../services/apiClient";
import type { JobRole } from "../../types/jobRole";

export function ManagementJobRolesPage() {
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => jobRolesService.listJobRoles().then(({ jobRoles }) => setRoles(jobRoles));

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await jobRolesService.createJobRole({
        title,
        description,
        requirements: {
          requiredSkills: requiredSkills.split(",").map((s) => s.trim()).filter(Boolean),
          preferredSkills: preferredSkills.split(",").map((s) => s.trim()).filter(Boolean),
        },
      });
      setTitle("");
      setDescription("");
      setRequiredSkills("");
      setPreferredSkills("");
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create job role");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ManagementLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Job Roles</h1>

        <form onSubmit={handleCreate} className="space-y-3 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-700">Create a job role</p>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={requiredSkills}
            onChange={(e) => setRequiredSkills(e.target.value)}
            placeholder="Required skills (comma-separated)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={preferredSkills}
            onChange={(e) => setPreferredSkills(e.target.value)}
            placeholder="Preferred skills (comma-separated)"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            disabled={creating}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </form>

        <div className="space-y-2">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">{r.title}</p>
              <p className="text-sm text-slate-600">{r.description}</p>
              <p className="mt-1 text-xs text-slate-500">Required: {r.requirements.requiredSkills.join(", ") || "—"}</p>
            </div>
          ))}
          {roles.length === 0 && <p className="text-sm text-slate-500">No job roles yet — create one above.</p>}
        </div>
      </div>
    </ManagementLayout>
  );
}
