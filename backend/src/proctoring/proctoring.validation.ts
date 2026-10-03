import { z } from "zod";
import { PROCTORING_EVENT_TYPES } from "./proctoringConfig";

export const recordEventSchema = z.object({
  eventType: z.enum(PROCTORING_EVENT_TYPES),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type RecordEventInput = z.infer<typeof recordEventSchema>;


export const capabilitySchema = z.object({
  camera: z.boolean(), microphone: z.boolean(), fullscreen: z.boolean(), clipboardBlocking: z.boolean(),
  visibilityMonitor: z.boolean(), faceDetection: z.boolean(), phoneDetection: z.boolean(), voiceMonitoring: z.boolean(),
  dynamicWatermark: z.boolean(), secureExamMode: z.boolean(), userAgent: z.string().max(1000).optional(),
  metadata: z.record(z.unknown()).optional(),
});
