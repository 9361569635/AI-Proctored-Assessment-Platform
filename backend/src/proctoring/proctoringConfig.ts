/**
 * Every event type escalates independently within one assessment attempt:
 * the Nth occurrence of a given type is compared against these thresholds
 * to decide its severity, and reaching `terminateAt` ends the assessment.
 * Counts are per (assessment, eventType) — a candidate's 1st MULTI_FACE and
 * 1st TAB_SWITCH are each their own "1st occurrence".
 */
export interface EscalationPolicy {
  warnAt: number;
  violationAt: number;
  terminateAt: number;
}

const DEFAULT_POLICY: EscalationPolicy = { warnAt: 1, violationAt: 2, terminateAt: 4 };

/**
 * Per-type overrides. Clipboard and multi-face events escalate fastest
 * (spec §28/§31 both describe a short warn→violation→terminate path);
 * no-face and voice anomalies are more lenient since a candidate briefly
 * looking away or a moment of background noise shouldn't end an attempt
 * (spec §32: "Do not terminate based on one temporary detection failure").
 */
export const PROCTORING_EVENT_TYPES = [
  "COPY_ATTEMPT",
  "PASTE_ATTEMPT",
  "CUT_ATTEMPT",
  "DRAG_DROP_ATTEMPT",
  "CLIPBOARD_ACCESS_ATTEMPT",
  "MULTI_FACE",
  "NO_FACE",
  "TAB_SWITCH",
  "WINDOW_BLUR",
  "FULLSCREEN_EXIT",
  "VOICE_ANOMALY",
  "DEV_TOOLS_OPEN",
  "PHONE_OR_DEVICE_DETECTED",
  "SUSPICIOUS_GAZE",
  "CAPABILITY_FAILURE",
] as const;

export type ProctoringEventType = (typeof PROCTORING_EVENT_TYPES)[number];

export const POLICY_BY_EVENT_TYPE: Partial<Record<ProctoringEventType, EscalationPolicy>> = {
  COPY_ATTEMPT: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  PASTE_ATTEMPT: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  CUT_ATTEMPT: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  DRAG_DROP_ATTEMPT: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  CLIPBOARD_ACCESS_ATTEMPT: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  MULTI_FACE: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  NO_FACE: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  TAB_SWITCH: { warnAt: 1, violationAt: 3, terminateAt: 5 },
  WINDOW_BLUR: { warnAt: 1, violationAt: 3, terminateAt: 5 },
  FULLSCREEN_EXIT: { warnAt: 1, violationAt: 3, terminateAt: 5 },
  VOICE_ANOMALY: { warnAt: 2, violationAt: 4, terminateAt: 6 },
  DEV_TOOLS_OPEN: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  PHONE_OR_DEVICE_DETECTED: { warnAt: 1, violationAt: 2, terminateAt: 3 },
  SUSPICIOUS_GAZE: { warnAt: 2, violationAt: 4, terminateAt: 6 },
  CAPABILITY_FAILURE: { warnAt: 1, violationAt: 2, terminateAt: 3 },
};

export function getPolicy(eventType: string): EscalationPolicy {
  return POLICY_BY_EVENT_TYPE[eventType as ProctoringEventType] ?? DEFAULT_POLICY;
}
