# API Reference — Phases 1-10 (Auth, Job Roles, Resume, Assessment Engine, Coding, Management, Communication, Proctoring)

Base URL: `http://localhost:4000/api`

Auth uses httpOnly cookies (`access_token`, `refresh_token`). Browser clients
don't need to do anything special beyond `fetch(url, { credentials: "include" })`.
Non-browser clients may instead send `Authorization: Bearer <access_token>`.

---

### `POST /auth/register`
Creates a CANDIDATE account. (Management/Super Admin accounts are provisioned
via `POST /management/users` by a Super Admin — see the Management section
below — or bootstrapped with `npm run seed`, not via this endpoint.)

Request body:
```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@example.com",
  "mobileNumber": "+91 90000 00000",
  "password": "at-least-8-chars",
  "confirmPassword": "at-least-8-chars",
  "jobRoleId": "clx...a job role id created by management"
}
```
`201` → `{ "user": { id, name, email, role, tokenVersion, createdAt, updatedAt, candidate } }`
Sets `access_token` + `refresh_token` cookies.

`409` if the email is already registered. `400` if `jobRoleId` doesn't exist or
passwords don't match.

---

### `POST /auth/login`
```json
{ "email": "rahul@example.com", "password": "at-least-8-chars" }
```
`200` → `{ "user": { ... } }`. Sets cookies. `401` on bad credentials (same
message for "no such user" and "wrong password" — never reveal which).

---

### `POST /auth/refresh`
No body — reads `refresh_token` cookie. `200` → `{ "accessToken": "..." }` and
refreshes the `access_token` cookie. `401` if the refresh token is expired,
invalid, or has been revoked (i.e. the user logged out since it was issued).

---

### `POST /auth/logout`
Requires auth. Bumps the user's `tokenVersion` (revoking all outstanding
refresh tokens) and clears both cookies. `204`.

---

### `GET /auth/me`
Requires auth. Returns the current user (with `candidate`/`managementUser`
relation if present).

---

## Error shape

Every error response:
```json
{ "error": { "message": "...", "details": { /* optional, e.g. zod field errors */ } } }
```

---

### `GET /job-roles`
Public — no auth required (a candidate needs this list before registering).
`200` → `{ "jobRoles": [{ id, title, description, requirements, createdAt, updatedAt }] }`

### `GET /job-roles/:id`
Public. `200` → `{ "jobRole": { ... } }`. `404` if not found.

### `POST /job-roles`
Requires MANAGEMENT or SUPER_ADMIN.
```json
{
  "title": "Software Developer",
  "description": "...",
  "requirements": { "requiredSkills": ["Python","SQL"], "preferredSkills": ["React"], "minExperienceYears": 1 }
}
```
`201` → `{ "jobRole": { ... } }`

### `PUT /job-roles/:id`
Requires MANAGEMENT or SUPER_ADMIN. Same body shape as create, all fields optional.

---

### `POST /resume/upload`
Requires CANDIDATE. `multipart/form-data` with a `resume` field (PDF/DOC/DOCX,
≤5MB). Validates both declared mimetype and actual file signature (magic
bytes) — a relabeled malicious file is rejected. Extracts raw text
server-side and stores it; re-uploading replaces the candidate's existing resume.

`201` → `{ "resume": { "id", "uploadedAt", "hasExtractedText": true } }`
`400` if the file is missing/too large/unsupported/unreadable.

### `POST /resume/analyze`
Requires CANDIDATE. Runs `AIProvider.extractResume()` against the stored
extracted text, persists the structured result on `Resume.parsedData`, and
rewrites the candidate's `Skill` rows from it. Then runs
`AIProvider.matchJobDescription()` (spec §5) against the candidate's
selected job role and persists it on `Resume.matchResult` — a match failure
never fails the request, since extraction is the primary result; `matchResult`
just comes back `null` in that case.

`200` → `{ "resumeId", "parsedData": { skills, education, projects, ... }, "matchResult": { matchingSkills, missingSkills, relevantProjects, relevantExperience, technicalStrengths, technicalGaps, resumeRelevance } | null }`
`404` if no resume has been uploaded yet.

### `GET /resume/me`
Requires CANDIDATE. `200` → `{ "resume": { id, uploadedAt, parsedData, matchResult, skills } }`

---

## Assessment (all routes require CANDIDATE auth; every route resolves "my
own" assessment from the token — no client-supplied assessment/candidate id
is ever trusted, per spec §58)

### `POST /assessment/start`
Creates the assessment (8 locked sessions + an unlocked, question-populated
session 1) and starts the server-side global timer. `400` if the candidate
hasn't analyzed a resume yet (`POST /resume/analyze`). Idempotent while
`IN_PROGRESS` — calling it again just returns current status, so a page
refresh can never restart the attempt (spec §40). `409` if a previous
attempt already finished.

### `GET /assessment/status`
Overview: overall status, per-session status/score, global time remaining.
Safe to poll — also where server-side timeout auto-finalization is checked
and applied if either the global or the current session's timer has expired.

### `GET /assessment/session/current`
The single currently-unlocked session: its questions (MCQ) or assigned
coding questions (visible test cases only — never `correctAnswer` or hidden
test data), remaining session/global seconds, and any answers already saved
(so a reconnect restores progress). `409` if time already expired and the
attempt was just auto-finalized — check `/assessment/result` instead.

### `POST /assessment/session/:sessionId/answer`
```json
{ "questionId": "...", "answer": "the exact option text" }
```
Upserts — answering the same question again overwrites. Scored server-side
immediately but never reveals correctness. `200` → `{ "saved": true }`.

### `POST /assessment/session/:sessionId/complete`
Finishes the current session: recomputes its score from stored answers,
applies the session's eligibility gate (spec §8-12) if it has one, then
either unlocks + populates the next session or finalizes the whole
assessment. For a CODING session, `400`s if any assigned question hasn't
been RUN yet (spec §16). Returns the same shape as `GET /assessment/status`.

### `GET /assessment/result`
Before `resultReleaseTime` (48h after completion): `{ "status": "under_review", "resultAvailableAt" }`.
After: `{ "status": "released", "overallScore", "eligibility", "finalStatus", "category", "sessionScores", "score" }`.
`400` if the assessment is still in progress.

---

## Coding

### `POST /coding/questions` — MANAGEMENT/SUPER_ADMIN
Authors a curated coding question. Requires **exactly 15** test cases:
exactly 10 with `isHidden: false`, exactly 5 with `isHidden: true` (spec
§13/§19/§20).
```json
{
  "session": "EASY_CODING",
  "title": "Two Sum",
  "description": "...",
  "difficulty": "EASY",
  "marks": 10,
  "testCases": [{ "input": "...", "expectedOutput": "...", "isHidden": false }, ...15 total]
}
```

### `GET /coding/questions` / `GET /coding/questions/:id` — MANAGEMENT/SUPER_ADMIN
Lists the bank. Hidden test case input/output is never included — only
`visibleTestCases` and a `hiddenTestCaseCount` (spec §50 applies to
management too, not just candidates).

### `POST /coding/session/:sessionId/submit` — CANDIDATE
```json
{ "codingQuestionId": "...", "language": "PYTHON", "sourceCode": "..." }
```
Runs against the **10 visible test cases only** (spec §15) — for
iterating; doesn't affect scoring or count as the required RUN. `200` →
`{ "results": [{ "testCaseId", "isHidden": false, "passed", "stdout", "stderr", "timedOut" }, ...] }`
(or `{ "compileError": "..." }` if it didn't compile).

### `POST /coding/session/:sessionId/run` — CANDIDATE
Same body shape as submit. Runs against **all 15** (visible + hidden — spec
§16-18) and is what counts toward the session score and the "at least one
Easy Coding question passed" eligibility condition (spec §22). Hidden
results are redacted to `{ "testCaseId", "isHidden": true, "passed" }` only.
`200` → results array plus `{ "passed": boolean, "passedCount", "totalCount" }`.

---

## Management (spec §47-53)

### `POST /management/users` — SUPER_ADMIN only
Provisions a MANAGEMENT account (spec §2 "Manage management accounts").
```json
{ "name": "Priya Sharma", "email": "priya@example.com", "password": "...", "permissions": ["shortlist"] }
```
`201` → `{ "user": { id, name, email, role: "MANAGEMENT", managementUser } }`.
There's no self-registration path for this role — the very first Super
Admin account comes from `npm run seed` (see root README).

### `GET /management/dashboard` — MANAGEMENT/SUPER_ADMIN
```json
{
  "cards": { "totalCandidates", "assessmentStarted", "assessmentCompleted", "eligible", "notEligible", "shortlisted", "rejected", "underReview", "proctoringViolations" },
  "charts": { "averageScore", "sessionPerformance": { "aptitude", "logical", "reasoning", "communication", "grammar" }, "codingPerformance": { "easy", "moderate", "hard" } }
}
```
`proctoringViolations` is always `0` for now — the proctoring module isn't
built (see roadmap); this key will start reflecting real data the moment it
lands, no API shape change needed.

### `GET /management/candidates` — MANAGEMENT/SUPER_ADMIN
Query params (all optional): `jobRoleId`, `eligibility` (`ELIGIBLE`|`NOT_ELIGIBLE`),
`finalStatus` (`PENDING`|`SHORTLISTED`|`NOT_SHORTLISTED`|`UNDER_REVIEW`|`REJECTED`),
`search` (matches name/email/phone). `200` → `{ "candidates": [...] }`, one
row per candidate with every column from spec §48's table, including
`resumeMatch` (`"High"|"Medium"|"Low"|null`, from `Resume.matchResult`).

### `GET /management/candidates/:id` — MANAGEMENT/SUPER_ADMIN
Full detail: candidate info, resume (extracted skills + `matchResult`),
latest assessment with per-session scores, coding submissions (source code,
pass/fail counts, execution time/memory, errors — **never** hidden test
case input/output, spec §50), a `proctoring` placeholder object (that
module isn't built), `aiRecommendation` (spec §46 — computed automatically
when the assessment finalizes; `null` if it hasn't finalized yet or the AI
call failed when it did), and the current `shortlisting` record.

### `PUT /management/candidates/:id/status` — MANAGEMENT/SUPER_ADMIN
```json
{ "category": "RECOMMENDED", "finalStatus": "SHORTLISTED", "comment": "Strong coding round" }
```
All fields optional — send only what's changing. Writes an `AuditLog` row
recording the previous and new category/status plus the acting user (spec
§53). `400` if the candidate has no finalized assessment yet.

---

## Audio / Communication (spec §11, §44)

### `POST /audio/session/:sessionId/question/:questionId/submit` — CANDIDATE
`multipart/form-data` with an `audio` field (webm/ogg/wav/mpeg/mp4, ≤10MB —
the reference sentence to repeat is the `question` text on that Question,
already visible to the candidate via `GET /assessment/session/current`, so
unlike MCQ/coding there's no answer key being protected here). Stores the
recording, transcribes it (`SpeechProvider`), scores the transcript against
the reference sentence (`AIProvider.analyzeCommunication`), and returns the
result immediately — re-recording is allowed; the latest submission per
question is what counts for scoring and the "answered every question"
completion gate.

`200` → `{ "id", "transcript", "communicationScore", "wordAccuracy", "missingWords" }`

---

## Proctoring (spec §25-35)

### `POST /proctoring/event` — CANDIDATE
```json
{ "eventType": "TAB_SWITCH", "confidence": 0.9, "metadata": { "faceCount": 2 } }
```
`eventType` is one of: `COPY_ATTEMPT`, `PASTE_ATTEMPT`, `CUT_ATTEMPT`,
`DRAG_DROP_ATTEMPT`, `CLIPBOARD_ACCESS_ATTEMPT`, `MULTI_FACE`, `NO_FACE`,
`TAB_SWITCH`, `WINDOW_BLUR`, `FULLSCREEN_EXIT`, `VOICE_ANOMALY`,
`DEV_TOOLS_OPEN`. `confidence` and `metadata` are optional. Resolves the
candidate's current in-progress assessment from the auth token — never a
client-supplied assessment id.

Severity is computed server-side from how many times this exact event type
has occurred for this assessment attempt (never trusted from the client) —
see `backend/src/proctoring/proctoringConfig.ts` for the per-type
warn/violation/terminate thresholds. Reaching the termination threshold
finalizes the assessment through the same pipeline as any other
termination (scoring, AI candidate analysis, 48h result release).

`200` → `{ "severity": "INFO"|"WARNING"|"VIOLATION"|"CRITICAL", "occurrence": number, "terminated": boolean, "message": string }`
`400` if there's no in-progress assessment to log the event against.

---

## Endpoints planned for later phases (not yet implemented)

Every endpoint in spec §63's list now has both an API and, where
applicable, a UI. (The AI interview endpoints are the one exception —
intentionally not being built, descoped at the user's request.)
