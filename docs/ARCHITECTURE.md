# Architecture

## 1. Two portals, one backend

```
frontend/           React + TypeScript + Tailwind (single app, route-gated by role)
  candidate routes  → registration, resume upload, system check, assessment runner, result
  management routes → dashboard, candidate table, candidate detail, proctoring report

backend/             Node.js + Express + TypeScript, REST API under /api
  auth               ✅ Phase 1
  resume             resume upload/parse + AI extraction
  job-roles          management CRUD for job roles/descriptions
  assessment         session engine, server-authoritative timer & eligibility
  coding             submission handling, talks to the sandbox executor
  audio              listen-and-repeat upload, speech-to-text, similarity scoring
  proctoring         event ingestion from the frontend's webcam/mic/clipboard hooks
  management         dashboard aggregation, shortlisting, overrides, audit log
```

One Express app, one Postgres database (schema in `database/schema/schema.prisma`),
one deploy unit for the API. The coding-execution sandbox (`docker/coding-sandbox/`)
is a **separate** process/service the API calls out to — candidate code must never
run inside the API process (spec §42).

## 2. Request flow / module boundaries

Every module follows the same shape: `routes → controller → service → prisma`.
- **Controllers** only do HTTP concerns: parse/validate the request (zod), call a
  service, shape the response. No business logic.
- **Services** hold business logic and are the only layer allowed to touch Prisma
  directly for that module. Services throw `ApiError`; they never write to
  `res` themselves, so they're unit-testable without an HTTP layer.
- **Nothing trusts client-submitted scores, timers, or eligibility flags.** Every
  score, session-gate decision, and shortlisting eligibility check (spec §23,
  §69) is computed server-side from stored answers/submissions, on every read —
  never accepted as a field in a request body.

## 3. Auth (Phase 1 — implemented)

- Password hashing: bcrypt, 12 rounds.
- Access token: short-lived JWT (15m default), carries `{ sub, role }`, sent as
  an httpOnly cookie (`access_token`) and also accepted via `Authorization:
  Bearer` for non-browser clients.
- Refresh token: longer-lived JWT (7d default), carries `{ sub, tokenVersion }`,
  scoped to the `/api/auth/refresh` cookie path. `User.tokenVersion` is bumped
  on logout, invalidating every outstanding refresh token for that user without
  needing a server-side token blocklist table.
- `requireAuth` → `requireRole(...)` is the only path any route has into
  role-gated data. Candidate self-registration only ever creates `CANDIDATE`
  users — `MANAGEMENT`/`SUPER_ADMIN` accounts are provisioned by a Super Admin
  (spec §2), which is implemented in the management-portal phase, not here.

## 4. Assessment engine design (for the next phase)

- `Assessment` has a server-recorded `startTime`; the **global 2h15m timer and
  every per-session timer are computed server-side** from `startTime`/session
  `startTime`, not trusted from the client (spec §41). The client polls/receives
  remaining time; it never sets it.
- `AssessmentSession.status` implements the sequential locking in spec §39:
  a session is `LOCKED` until the prior session's eligibility check passes, and
  the API rejects any attempt to start or answer a session that isn't the
  candidate's current unlocked session.
- After each gated session (Aptitude/Logical/Reasoning/Communication), the
  service recomputes that session's score from stored `Answer` rows and, if
  below the configured minimum, sets `Assessment.status = TERMINATED` and
  `eligibility = NOT_ELIGIBLE` — the assessment-completion codepath and the
  final-eligibility codepath (spec §69) share this scoring function so there's
  one source of truth for "did they pass this session."

## 5. Coding sandbox design (for the coding-sandbox phase)

`docker/coding-sandbox/` holds one Dockerfile per language. The pattern (shown
for Python; replicate per language):

- A minimal, non-root image containing only the language runtime.
- The **executor service** (not the API process) runs each submission as:
  `docker run --rm --network none --memory=256m --cpus=0.5 --pids-limit=64
  --read-only --tmpfs /tmp -v <workdir>:/sandbox:ro sandbox-python
  timeout 5 python3 /sandbox/solution.py < input.txt`
- No network, a hard memory/CPU/pids ceiling, a wall-clock `timeout`, and a
  read-only bind mount defeat the specific threats in spec §42 (fork bombs,
  infinite loops, resource exhaustion, filesystem/network escape). For a
  production deployment, swap the Docker CLI wrapper for gVisor/Firecracker or
  a managed sandboxed-execution API — the interface the rest of the app calls
  (`run(language, code, stdin) -> { stdout, stderr, exitCode, timeMs, memKb }`)
  stays the same either way.
- Hidden test cases are only ever read by the executor/service layer; no
  candidate-facing controller serializes a `TestCase` row where
  `isHidden = true`.

## 6. AI abstraction layer (for the AI-question-generation / analysis phases)

A single `AIProvider` interface so the app isn't locked to one vendor:

```ts
interface AIProvider {
  extractResume(rawText: string): Promise<ParsedResume>;
  matchJobDescription(resume: ParsedResume, jobRole: JobRole): Promise<MatchResult>;
  generateQuestions(profile: CandidateProfile, session: SessionType, count: number): Promise<Question[]>;
  analyzeCommunication(transcript: string, referenceSentence: string): Promise<CommunicationScore>;
  conductInterviewTurn(history: InterviewTurn[], candidateContext: CandidateProfile): Promise<InterviewTurn>;
  analyzeCandidate(assessment: AssessmentSummary): Promise<CandidateAnalysis>;
}
```

Each method is implemented once against a configurable provider (`AI_API_KEY`
in `.env`); every AI-driven module (resume extraction, JD matching, question
generation, communication scoring, interview, candidate analysis) calls this
interface, never a provider SDK directly. Per spec §61/§46, `analyzeCandidate`
returns a recommendation + reasons — it is advisory input to the management
portal, never something that writes `Shortlisting.finalStatus` itself.

## 7. Anti-cheat design (for the proctoring phase)

- Clipboard/copy-paste blocking (spec §25–§28) is a **frontend** concern
  (`clipboardEvent` / `keydown` interception + a hardened Monaco paste handler
  that only allows paste events originating from in-editor selection). Every
  blocked attempt is also POSTed to `/api/proctoring/event` so it's logged
  server-side, since a client-side-only block can't be trusted as the audit
  record.
- Webcam/mic monitoring (face count, voice activity) runs **in the browser**
  (WebRTC + an in-browser inference model or a streaming call to a vision/audio
  AI endpoint) and reports discrete events (`MULTI_FACE`, `NO_FACE`,
  `VOICE_ANOMALY`, ...) to the same endpoint, with the frontend never deciding
  termination itself — the backend applies the configured warning/violation/
  termination thresholds (spec §28, §31) and is the only thing allowed to set
  `Assessment.status = TERMINATED`.
- Per spec §34, this design is explicit that a normal browser **cannot** fully
  block a second physical device, HDMI capture, or a phone held out of frame —
  the optional Lockdown Desktop Application (out of scope for Phase 1) is
  where OS-level controls belong.

## 8. What's implemented vs. scaffolded right now

| Area | Status |
|---|---|
| Project structure, DB schema (22 models) | ✅ Implemented |
| Auth (register/login/logout/refresh/me, RBAC) | ✅ Implemented |
| Job roles, resume upload/parse/AI-extract | ✅ Implemented |
| AI abstraction layer (§6 design above) | ✅ Implemented — `extractResume`, `generateQuestions`, `matchJobDescription`, `analyzeCandidate`, `generateListenRepeatSentences`, `analyzeCommunication`; only `conductInterviewTurn` still throws `NotImplementedYetError` (AI Interview module — descoped at the user's request, not being built) |
| Resume↔JD matching | ✅ Implemented — runs automatically inside `POST /resume/analyze`, shown to candidate + management |
| AI question generation (MCQ) | ✅ Implemented — Aptitude/Logical/Reasoning/Grammar |
| Assessment engine (§4 design above) | ✅ Implemented — timers, session locking, eligibility gates, final scoring, 48h release |
| Coding sandbox (§5 design above) | ✅ Implemented — all 6 languages, exactly as designed above |
| AI candidate analysis | ✅ Implemented — runs automatically when an assessment finalizes, advisory only (spec §61), shown on the candidate detail page |
| Communication session (audio/STT) | ✅ Implemented — browser TTS playback, `MediaRecorder` capture, pluggable `SpeechProvider` (mock by default; real transcription needs `SPEECH_PROVIDER=openai` + `SPEECH_API_KEY`), scored via `analyzeCommunication`, fully wired into the engine's timer/gating/scoring |
| Candidate portal UI | ✅ Implemented — system check, consent, full assessment runner (MCQ + Communication + coding), result page. All 8 sessions completable end to end. |
| Management portal UI | ✅ Implemented — dashboard, candidate table/detail, shortlisting override + audit log, job-role authoring, coding-question authoring. Proctoring section is a placeholder (backend module not built) |
| Anti-cheat (§7 design above) | 🟡 Real, partially scoped — see `backend/src/proctoring/*` + `frontend/src/components/ProctoringMonitor.tsx`. Event ingestion + escalating policy + termination pipeline are fully implemented; tab-switch/fullscreen-exit detection is 100% reliable; face-count detection is best-effort (browser `FaceDetector` API where available, no-op elsewhere — no ML library was added given no way to test one here); clipboard blocking works page-wide but the coding editor's exemption from it doesn't yet distinguish internal vs. external paste (see `CodingEditor.tsx`) |
| Testing | 🟡 Pure-logic unit tests only (`backend/TESTING.md`) — no integration tests against a live database yet |
| Deployment | ✅ `docker-compose.yml` + Dockerfiles + CI workflow (typecheck + unit tests) |
| Everything else in this document | 📐 Designed here, not yet coded — see README roadmap |
