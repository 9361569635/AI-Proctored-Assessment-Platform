import { useEffect, useState } from "react";
import { ManagementLayout } from "../../layouts/ManagementLayout";
import * as codingQuestionsService from "../../services/codingQuestions.service";
import { ApiClientError } from "../../services/apiClient";
import type { CodingQuestionListItem, CodingSession, CodingDifficulty } from "../../types/codingQuestion";

const SESSIONS: CodingSession[] = ["EASY_CODING", "MODERATE_CODING", "HARD_CODING"];
const DIFFICULTIES: CodingDifficulty[] = ["EASY", "MODERATE", "HARD"];

interface TestCaseRow {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
}

// Spec §13/§19/§20: every coding question needs exactly 10 visible + 5
// hidden test cases — default the form to that shape so it validates as-is.
function defaultTestCases(): TestCaseRow[] {
  return [
    ...Array.from({ length: 10 }, () => ({ input: "", expectedOutput: "", isHidden: false })),
    ...Array.from({ length: 5 }, () => ({ input: "", expectedOutput: "", isHidden: true })),
  ];
}

export function ManagementCodingQuestionsPage() {
  const [questions, setQuestions] = useState<CodingQuestionListItem[]>([]);
  const [session, setSession] = useState<CodingSession>("EASY_CODING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<CodingDifficulty>("EASY");
  const [marks, setMarks] = useState(10);
  const [testCases, setTestCases] = useState<TestCaseRow[]>(defaultTestCases());
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => codingQuestionsService.listCodingQuestions().then(({ codingQuestions }) => setQuestions(codingQuestions));

  useEffect(() => {
    load();
  }, []);

  const updateTestCase = (index: number, field: keyof TestCaseRow, value: string | boolean) => {
    setTestCases((prev) => prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  const visibleCount = testCases.filter((t) => !t.isHidden).length;
  const hiddenCount = testCases.filter((t) => t.isHidden).length;

  const handleCreate = async () => {
    setError(null);
    if (visibleCount !== 10 || hiddenCount !== 5) {
      setError(`Need exactly 10 visible and 5 hidden test cases (currently ${visibleCount} visible, ${hiddenCount} hidden).`);
      return;
    }
    if (testCases.some((tc) => !tc.expectedOutput.trim())) {
      setError("Every test case needs an expected output.");
      return;
    }
    setCreating(true);
    try {
      await codingQuestionsService.createCodingQuestion({ session, title, description, difficulty, marks, testCases });
      setTitle("");
      setDescription("");
      setTestCases(defaultTestCases());
      setExpanded(false);
      load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create coding question");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ManagementLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">Coding Questions</h1>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-700">Create a coding question</p>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Session</span>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as CodingSession)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Difficulty</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as CodingDifficulty)}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Marks</span>
              <input
                type="number"
                min={1}
                value={marks}
                onChange={(e) => setMarks(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

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
            placeholder="Description / problem statement"
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />

          <div>
            <button type="button" onClick={() => setExpanded((v) => !v)} className="text-sm font-medium text-slate-700 underline">
              {expanded ? "Hide" : "Edit"} test cases ({visibleCount} visible, {hiddenCount} hidden — need 10 + 5)
            </button>
            {expanded && (
              <div className="mt-3 space-y-2">
                {testCases.map((tc, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                    <input
                      value={tc.input}
                      onChange={(e) => updateTestCase(i, "input", e.target.value)}
                      placeholder={`Input ${i + 1}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    />
                    <input
                      value={tc.expectedOutput}
                      onChange={(e) => updateTestCase(i, "expectedOutput", e.target.value)}
                      placeholder="Expected output"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    />
                    <label className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-500">
                      <input type="checkbox" checked={tc.isHidden} onChange={(e) => updateTestCase(i, "isHidden", e.target.checked)} />
                      Hidden
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>

        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-900">
                {q.title} <span className="font-normal text-slate-500">({q.session} · {q.difficulty} · {q.marks} marks)</span>
              </p>
              <p className="text-sm text-slate-600">{q.description}</p>
              <p className="mt-1 text-xs text-slate-500">
                {q.visibleTestCases.length} visible test cases, {q.hiddenTestCaseCount} hidden
              </p>
            </div>
          ))}
          {questions.length === 0 && <p className="text-sm text-slate-500">No coding questions yet — create one above.</p>}
        </div>
      </div>
    </ManagementLayout>
  );
}
