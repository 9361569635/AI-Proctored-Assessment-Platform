import { useState } from "react";
import { CodingEditor } from "../../components/CodingEditor";
import * as codingService from "../../services/coding.service";
import { ApiClientError } from "../../services/apiClient";
import type { AssignedCodingQuestion, CodingLanguage, RunOrSubmitResponse, TestCaseResult, VisibleTestCase } from "../../types/assessment";

const LANGUAGES: CodingLanguage[] = ["PYTHON", "C", "CPP", "JAVA", "R", "SWIFT"];

const STARTER: Record<CodingLanguage, string> = {
  PYTHON: "# Read input via input() / sys.stdin, print your answer\n",
  C: "#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n",
  CPP: "#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n",
  JAVA: "public class Solution {\n    public static void main(String[] args) {\n    }\n}\n",
  R: "# Read with scan()/readLines(), print with cat()/print()\n",
  SWIFT: "import Foundation\n\n",
};

function firstFailingVisibleStderr(results: RunOrSubmitResponse["results"]): string | undefined {
  for (const r of results) {
    if (!r.isHidden && !r.passed && "stderr" in r && r.stderr) return r.stderr;
  }
  return undefined;
}

/**
 * Test-case table. The PARENT controls whether this renders at all — it
 * must not be mounted until the candidate has clicked Run All Test Cases or
 * Submit at least once (see CodingQuestionCard below). Once shown:
 *  - Visible rows: Expected Input/Output from the question data, Actual
 *    Output from the execution result's `stdout` (this is the candidate's
 *    own code's output — comparing it against Expected Output is exactly
 *    what produces the PASS/FAIL in `passed`).
 *  - Hidden rows: everything masked as "Hidden" except the PASS/FAIL badge.
 *    The hidden variant of TestCaseResult has no stdout field at all (the
 *    backend never sends it), so there's nothing to accidentally leak here
 *    even if this changed later.
 */
function TestCaseTable({
  visibleTestCases,
  results,
}: {
  visibleTestCases: VisibleTestCase[];
  results: TestCaseResult[];
}) {
  const visibleResultById = new Map<string, Extract<TestCaseResult, { isHidden: false }>>();
  const hiddenResults: Extract<TestCaseResult, { isHidden: true }>[] = [];
  for (const r of results) {
    if (r.isHidden) hiddenResults.push(r);
    else visibleResultById.set(r.testCaseId, r);
  }

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Test Case</th>
            <th className="px-3 py-2">Expected Input</th>
            <th className="px-3 py-2">Expected Output</th>
            <th className="px-3 py-2">Actual Output</th>
            <th className="px-3 py-2">Result</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visibleTestCases.map((tc, i) => {
            const r = visibleResultById.get(tc.id);
            return (
              <tr key={tc.id}>
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">Test Case {i + 1}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{tc.input || "(empty)"}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{tc.expectedOutput}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{r ? r.stdout || "(empty)" : "—"}</td>
                <td className="px-3 py-2">{r ? <ResultBadge passed={r.passed} /> : <span className="text-slate-400">—</span>}</td>
              </tr>
            );
          })}
          {hiddenResults.map((r, i) => (
            <tr key={r.testCaseId}>
              <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">Hidden Test Case {i + 1}</td>
              <td className="px-3 py-2 text-slate-400">Hidden</td>
              <td className="px-3 py-2 text-slate-400">Hidden</td>
              <td className="px-3 py-2 text-slate-400">Hidden</td>
              <td className="px-3 py-2">
                <ResultBadge passed={r.passed} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold ${passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
    >
      {passed ? "PASS" : "FAIL"}
    </span>
  );
}

export function CodingQuestionCard({
  sessionId,
  question,
  index,
  onRun,
}: {
  sessionId: string;
  question: AssignedCodingQuestion;
  index: number;
  onRun: (questionId: string) => void;
}) {
  const [language, setLanguage] = useState<CodingLanguage>("PYTHON");
  const [code, setCode] = useState(STARTER.PYTHON);
  const [result, setResult] = useState<RunOrSubmitResponse | null>(null);
  const [busy, setBusy] = useState<"submit" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const changeLanguage = (lang: CodingLanguage) => {
    setLanguage(lang);
    setCode(STARTER[lang]);
    setResult(null);
  };

  const runAction = async (action: "submit" | "run") => {
    setError(null);
    setBusy(action);
    try {
      const payload = { codingQuestionId: question.id, language, sourceCode: code };
      const res =
        action === "submit"
          ? await codingService.submitCode(sessionId, payload)
          : await codingService.runCode(sessionId, payload);
      setResult(res);
      if (action === "run") {
        // Question completion is tracked purely by "Run All Test Cases was
        // executed" — not by whether any test passed, and not tied to
        // whether the test-case table below is showing or what it shows.
        // This fires unconditionally, regardless of pass/fail outcome,
        // compile errors, or runtime errors. Do not add any passed/failed
        // condition to this call.
        setHasRun(true);
        onRun(question.id);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Execution failed");
    } finally {
      setBusy(null);
    }
  };

  const failingStderr = result && !result.compileError ? firstFailingVisibleStderr(result.results) : undefined;
  // The test-case section (table or compile-error message) only exists once
  // `result` is set — i.e. after the candidate has clicked Run or Submit at
  // least once. Nothing test-case-related renders before that; there is no
  // pre-run preview of visible test cases anymore.
  const hasAttempted = result !== null;

  return (
    <div>
      <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Question {index + 1}</p>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* LEFT: the coding problem */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-slate-900">{question.title}</h3>
            <span className="text-sm text-slate-500">{question.marks} marks</span>
          </div>
          <p className="whitespace-pre-wrap text-base leading-relaxed text-slate-600">{question.description}</p>
        </div>

        {/* RIGHT: the coding sandbox — language, editor, actions, then results below (hidden until an attempt is made) */}
        <div>
          <select
            value={language}
            onChange={(e) => changeLanguage(e.target.value as CodingLanguage)}
            className="mb-2 rounded-md border border-slate-300 px-2 py-1 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <CodingEditor language={language} value={code} onChange={setCode} />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => runAction("submit")}
              disabled={busy !== null}
              className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === "submit" ? "Submitting…" : "Submit (visible tests)"}
            </button>
            <button
              onClick={() => runAction("run")}
              disabled={busy !== null}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === "run" ? "Running…" : "Run All Test Cases"}
            </button>
            {hasRun && <span className="text-xs text-emerald-600">? Run recorded — you can still edit and Run again</span>}
          </div>

          {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {hasAttempted && (
            <>
              {result.compileError ? (
                <pre className="mt-3 whitespace-pre-wrap rounded bg-red-50 p-2 text-xs text-red-700">{result.compileError}</pre>
              ) : (
                <>
                  {failingStderr && (
                    <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs text-slate-600">{failingStderr}</pre>
                  )}
                  {question.visibleTestCases.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1 text-xs font-medium text-slate-500">Test Cases</p>
                      <TestCaseTable visibleTestCases={question.visibleTestCases} results={result.results} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
