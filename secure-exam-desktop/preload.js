const { contextBridge, ipcRenderer } = require("electron");

// Kept for backward compatibility: frontend/src/pages/candidate/AssessmentRunner.tsx
// already reads this flag when it reports `secureExamMode` in the
// /proctoring/capabilities payload. Do not rename without updating that file.
contextBridge.exposeInMainWorld("__SECURE_EXAM_MODE__", true);

contextBridge.exposeInMainWorld("secureExamDesktop", {
  isSecureExamMode: true,
  platform: process.platform,

  getDisplayCount: () => ipcRenderer.invoke("secure-exam:get-display-count"),

  /**
   * Subscribes to violations the desktop shell detects that a web page
   * cannot see for itself (a second monitor, a real DevTools instance, a
   * pressed PrintScreen key). Ordinary browser-visible events — tab
   * switches, window blur, fullscreen exit, clipboard attempts — are
   * intentionally NOT duplicated here: they already fire correctly inside
   * this Chromium-based window and are reported by the existing
   * frontend/src/components/ProctoringMonitor.tsx. Forwarding them again
   * from here would double-count a single real event and could trip the
   * server's escalation thresholds unfairly.
   */
  onNativeViolation: (callback) => {
    const handler = (_event, payload) => callback(payload.eventType, payload.metadata);
    ipcRenderer.on("secure-exam:violation", handler);
    return () => ipcRenderer.removeListener("secure-exam:violation", handler);
  },

  /**
   * Call once the candidate has submitted and reached the result screen.
   * Releases kiosk/fullscreen lockdown and re-enables the window's close
   * button; it does not quit the app, so the candidate can still read their
   * result before closing it themselves.
   */
  requestExit: (reason) => ipcRenderer.send("secure-exam:exit", reason),
});
