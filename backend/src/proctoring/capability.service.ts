import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export interface CapabilityInput {
  camera: boolean; microphone: boolean; fullscreen: boolean; clipboardBlocking: boolean;
  visibilityMonitor: boolean; faceDetection: boolean; phoneDetection: boolean; voiceMonitoring: boolean;
  dynamicWatermark: boolean; secureExamMode: boolean; userAgent?: string; metadata?: Record<string, unknown>;
}

export async function recordCapabilities(candidateId: string, input: CapabilityInput) {
  const assessment = await prisma.assessment.findFirst({ where: { candidateId, status: "IN_PROGRESS" }, orderBy: { createdAt: "desc" } });
  if (!assessment) throw ApiError.badRequest("No in-progress assessment found");
  return prisma.securityCapability.upsert({
    where: { assessmentId: assessment.id },
    update: { ...input, metadata: input.metadata as object | undefined, checkedAt: new Date() },
    create: { ...input, candidateId, assessmentId: assessment.id, metadata: input.metadata as object | undefined },
  });
}
