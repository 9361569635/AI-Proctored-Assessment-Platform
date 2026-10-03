import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { getPolicy } from "./proctoringConfig";
import { terminateForProctoringViolation } from "../assessment/assessment.service";
import type { ProctoringSeverity } from "@prisma/client";
import { writeAuditLog } from "../utils/audit";

interface RecordEventParams {
  candidateId: string;
  eventType: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface RecordEventResult {
  severity: ProctoringSeverity;
  occurrence: number;
  terminated: boolean;
  message: string;
}

function severityMessage(severity: ProctoringSeverity, occurrence: number, terminated: boolean): string {
  if (terminated) return "Your assessment has been terminated due to repeated proctoring violations.";
  switch (severity) {
    case "CRITICAL":
      return "Final warning: one more violation will terminate your assessment.";
    case "VIOLATION":
      return "A violation has been recorded. Repeated violations may terminate your assessment.";
    case "WARNING":
      return "Warning: this action is not allowed during the assessment.";
    default:
      return occurrence > 1 ? "Recorded." : "";
  }
}

/**
 * Records one proctoring event and applies the escalation policy (spec
 * §28/§31/§35: warn → violation → terminate, with the exact threshold
 * varying by event type — see proctoringConfig.ts). Severity is always
 * computed server-side from the event's occurrence count for this
 * assessment attempt — never trusted from the client, same principle as
 * scoring elsewhere in the app.
 */
export async function recordEvent(params: RecordEventParams): Promise<RecordEventResult> {
  const { candidateId, eventType, confidence, metadata } = params;

  const assessment = await prisma.assessment.findFirst({
    where: { candidateId, status: "IN_PROGRESS" },
  });
  if (!assessment) {
    throw ApiError.badRequest("No in-progress assessment to log this event against");
  }

  const priorCount = await prisma.proctoringEvent.count({
    where: { assessmentId: assessment.id, eventType },
  });
  const occurrence = priorCount + 1;
  const policy = getPolicy(eventType);

  const severity: ProctoringSeverity =
    occurrence >= policy.terminateAt
      ? "CRITICAL"
      : occurrence >= policy.violationAt
        ? "VIOLATION"
        : occurrence >= policy.warnAt
          ? "WARNING"
          : "INFO";

  await prisma.proctoringEvent.create({
    data: {
      assessmentId: assessment.id,
      eventType,
      severity,
      confidence,
      metadata: metadata as object | undefined,
    },
  });

  const terminated = occurrence >= policy.terminateAt ? await terminateForProctoringViolation(candidateId) : false;
  await writeAuditLog({ action: "PROCTORING_EVENT", entity: "Assessment", entityId: assessment.id, metadata: { candidateId, eventType, severity, occurrence, terminated } });

  return { severity, occurrence, terminated, message: severityMessage(severity, occurrence, terminated) };
}
