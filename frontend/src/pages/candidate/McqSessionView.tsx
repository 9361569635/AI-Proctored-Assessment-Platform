import { useState } from "react";
import * as assessmentService from "../../services/assessment.service";
import type { CurrentSessionResponse } from "../../types/assessment";

type McqQuestion = CurrentSessionResponse["questions"][number];

export function McqQuestionPanel({
  sessionId,
  question,
  index,
  selectedAnswer,
  onAnswered,
}: {
  sessionId: string;
  question: McqQuestion;
  index: number;
  selectedAnswer?: string;
  onAnswered: (questionId: string, answer: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (option: string) => {
    setSaving(true);
    setError(null);
    try {
      await assessmentService.submitAnswer(sessionId, question.id, option);
      onAnswered(question.id, option);
    } catch {
      setError("Couldn't save that answer — try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Question {index + 1}</p>
      <p className="mb-8 text-2xl font-semibold leading-relaxed text-slate-900">{question.question}</p>
      <div className="space-y-3">
        {question.options.map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-5 py-4 text-lg transition-colors ${
              selectedAnswer === opt ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name={question.id}
              checked={selectedAnswer === opt}
              disabled={saving}
              onChange={() => handleSelect(opt)}
              className="h-5 w-5"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
