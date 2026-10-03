import { GENERAL_ASSESSMENT_INSTRUCTIONS, SESSION_INSTRUCTIONS } from "../../config/sessionInstructions";
import type { SessionType } from "../../types/assessment";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-slate-600">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-0.5 text-slate-400">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Pre-assessment panel — shown on the Consent/ready page, before Start Assessment. */
export function GeneralAssessmentInstructions() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-3 font-semibold text-slate-900">General Assessment Instructions</h2>
      <BulletList items={GENERAL_ASSESSMENT_INSTRUCTIONS} />
    </div>
  );
}

/**
 * In-assessment panel — shown in the right sidebar, below the progress
 * indicator, swapping content automatically based on the current session's
 * type. One component for all 8 sessions; the only thing that changes per
 * session is which config entry gets looked up.
 */
export function SessionInstructionsPanel({ sessionType }: { sessionType: SessionType }) {
  const config = SESSION_INSTRUCTIONS[sessionType];
  if (!config) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-900">{config.title}</p>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Instructions</p>
      <BulletList items={config.bullets} />
    </div>
  );
}