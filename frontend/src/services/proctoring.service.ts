import { apiFetch } from "./apiClient";

export interface ProctoringEventResult { severity: "INFO" | "WARNING" | "VIOLATION" | "CRITICAL"; occurrence: number; terminated: boolean; message: string; }
export const reportProctoringEvent = (eventType: string, metadata?: Record<string, unknown>, confidence?: number) =>
  apiFetch<ProctoringEventResult>("/proctoring/event", { method: "POST", body: { eventType, metadata, confidence } });

export interface SecurityCapabilities {
  camera: boolean; microphone: boolean; fullscreen: boolean; clipboardBlocking: boolean; visibilityMonitor: boolean;
  faceDetection: boolean; phoneDetection: boolean; voiceMonitoring: boolean; dynamicWatermark: boolean; secureExamMode: boolean;
  userAgent?: string; metadata?: Record<string, unknown>;
}
export const recordSecurityCapabilities = (body: SecurityCapabilities) =>
  apiFetch<{ id: string; checkedAt: string }>("/proctoring/capabilities", { method: "POST", body });
