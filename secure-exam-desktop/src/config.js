const fs = require("fs");
const path = require("path");

/**
 * Resolves runtime configuration in this order (highest priority first):
 *   1. Environment variables (ASSESSMENT_URL, ALLOWED_ORIGIN, ORG_NAME, SECURE_EXAM_OVERRIDE_CODE)
 *   2. A config.json placed next to the packaged executable (or the project
 *      root in dev) — lets non-technical exam-center staff configure the app
 *      without touching environment variables.
 *   3. Hard-coded fallback defaults, so the app still boots out of the box.
 *
 * IMPORTANT: overrideCode gates the emergency-unlock dialog (see main.js).
 * It is compared in plain text against what proctoring staff type in — this
 * is meant as an operational safety valve for a supervised exam center, not
 * as a cryptographic secret. Rotate it per exam window and never reuse the
 * example value in a real deployment.
 */
function loadJsonConfigFile() {
  const candidates = [
    path.join(process.cwd(), "config.json"),
    path.join(__dirname, "..", "config.json"),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, "utf8"));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[secure-exam] failed to parse ${file}:`, err.message);
    }
  }
  return {};
}

function loadConfig() {
  const fileConfig = loadJsonConfigFile();

  const assessmentUrl =
    process.env.ASSESSMENT_URL ||
    fileConfig.assessmentUrl ||
    "http://localhost:5173/candidate/system-check";

  const allowedOrigin =
    process.env.ALLOWED_ORIGIN ||
    fileConfig.allowedOrigin ||
    new URL(assessmentUrl).origin;

  const orgName = process.env.ORG_NAME || fileConfig.orgName || "AI Assessment Platform";

  const overrideCode =
    process.env.SECURE_EXAM_OVERRIDE_CODE || fileConfig.overrideCode || null;

  return { assessmentUrl, allowedOrigin, orgName, overrideCode };
}

module.exports = { loadConfig };
