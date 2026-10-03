const fs = require("fs");
const path = require("path");

/**
 * Append-only local log, kept for exam-center support staff to diagnose a
 * candidate's session after the fact (e.g. "why did the window unlock at
 * 10:42?"). This is a local troubleshooting aid, not the proctoring record
 * of truth — violations that reach the backend are recorded there via
 * /api/proctoring/event, independent of whether this file survives.
 */
function createLogger(userDataDir) {
  let logPath;
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    logPath = path.join(userDataDir, "secure-exam.log");
  } catch {
    logPath = null;
  }

  function log(event, details = {}) {
    const line = JSON.stringify({ ts: new Date().toISOString(), event, ...details });
    // eslint-disable-next-line no-console
    console.log(`[secure-exam] ${line}`);
    if (logPath) {
      try {
        fs.appendFileSync(logPath, line + "\n");
      } catch {
        // Best-effort only — never let logging failures affect the exam.
      }
    }
  }

  return { log, logPath };
}

module.exports = { createLogger };
