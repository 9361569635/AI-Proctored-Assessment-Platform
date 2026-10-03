import { prisma } from "../config/prisma";
import type { ProctoringSeverity } from "@prisma/client";

export interface ProctoringSummary {
  totalViolations: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  events: Array<{ eventType: string; severity: ProctoringSeverity; timestamp: Date; confidence: number | null }>;
}

/**
 * Used by the management candidate detail page (spec §51) and by AI
 * candidate analysis's proctoringRisk input. "Violations" counts
 * VIOLATION + CRITICAL severity events specifically — WARNING/INFO entries
 * are visible in the event list but don't count toward risk level,
 * matching spec §51's framing of "Total violations" as distinct from the
 * full event log.
 */
export async function getProctoringSummary(assessmentId: string): Promise<ProctoringSummary> {
  const events = await prisma.proctoringEvent.findMany({
    where: { assessmentId },
    orderBy: { timestamp: "desc" },
    select: { eventType: true, severity: true, timestamp: true, confidence: true },
  });

  const totalViolations = events.filter((e) => e.severity === "VIOLATION" || e.severity === "CRITICAL").length;
  const hasCritical = events.some((e) => e.severity === "CRITICAL");

  const riskLevel: ProctoringSummary["riskLevel"] = hasCritical
    ? "Critical"
    : totalViolations >= 3
      ? "High"
      : totalViolations >= 1
        ? "Medium"
        : "Low";

  return { totalViolations, riskLevel, events };
}
