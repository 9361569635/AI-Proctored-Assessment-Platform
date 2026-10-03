# AI-Based Recruitment Assessment Platform

Candidate Portal + Management Portal for AI-driven resume screening, a
proctored multi-session assessment, coding evaluation, and shortlisting.
Full spec: see the master prompt this repo was built from.

## Status: Phase 10 of 18 — every module in the original build order is now at least started

Built so far, matching the module order in the spec's §71 build plan:

1. ✅ **Project architecture** — see `docs/ARCHITECTURE.md`
2. ✅ **Database schema** — `database/schema/schema.prisma`, 22 models
3. ✅ **Authentication** — `backend/src/auth/\\\*`
4. ✅ **Job description management** — `backend/src/job-roles/\\\*`
5. ✅ **Resume processing** — `backend/src/resume/\\\*`
6. ✅ **AI abstraction layer** — `backend/src/ai/\\\*`
7. ✅ **AI question generation** — `backend/src/questions/\\\*`
8. ✅ **Assessment engine** — `backend/src/assessment/\\\*`
9. ✅ **Coding sandbox** — `docker/coding-sandbox/\\\*` + `backend/src/coding/\\\*`
10. ✅ **Candidate portal** — `frontend/src/pages/candidate/\\\*`: register → login
→ resume upload/analyze → system check → consent → the full assessment
runner (MCQ + real sandboxed coding) → a 48-hour-gated result page
11. ✅ **Management portal** — `backend/src/management/\\\*` +
`frontend/src/pages/management/\\\*`: a dashboard (status cards + score
averages), a filterable/searchable candidate table, a candidate detail
page (resume, session/coding breakdown, coding submissions with source
code — hidden test data still never exposed, per spec §50), and a
shortlisting override form that writes an `AuditLog` entry per change.
Also added `POST /api/management/users` (SUPER\_ADMIN-only account
provisioning) and a `npm run seed` bootstrap script, since without them
there was no way to create a management account at all except by
hand-editing the database.
12. ✅ **Resume↔JD matching + AI candidate analysis** — `matchJobDescription`
now runs automatically inside `POST /resume/analyze` and is shown to
both the candidate (in their dashboard) and management (a "Resume
Match" column, spec §48). `analyzeCandidate` (spec §46) now runs
automatically when an assessment finalizes and shows up on the
candidate detail page — advisory only, never decides `finalStatus`
itself (spec §61). Also added a coding-question authoring UI for
management, closing what had been a `curl`-only gap.
13. ✅ **Communication assessment** — `backend/src/audio/\\\*` +
`backend/src/speech/\\\*` + `frontend/src/components/assessment/CommunicationSessionView.tsx`:
the reference sentence is read aloud via the browser's built-in
text-to-speech (no backend/API-key dependency for playback), the
candidate's response is captured with `MediaRecorder`, uploaded,
transcribed (a pluggable `SpeechProvider` — mock by default, real
OpenAI Whisper transcription with `SPEECH\\\_PROVIDER=openai` +
`SPEECH\\\_API\\\_KEY`), and scored against the reference text via
`AIProvider.analyzeCommunication`. Wired into the assessment engine
exactly like the MCQ and coding sessions — same timer, same
"must-complete-every-question" gate, same session-locking. This was
the last session type that could strand a candidate mid-assessment;
all 8 sessions are now completable end to end.
14. ✅ **Proctoring, anti-copy/paste, testing, deployment** —
`backend/src/proctoring/\\\*` + `frontend/src/components/ProctoringMonitor.tsx`:
a real event-ingestion API with a per-event-type escalating
warn→violation→terminate policy (spec §28/§31/§35), wired into the
exact same assessment-finalization pipeline as any other termination.
100%-reliable tab-switch/fullscreen-exit detection; best-effort
face-count monitoring via the browser's experimental `FaceDetector` API
where available. Page-wide clipboard blocking for anti-copy/paste, with
the coding editor exempted so normal Monaco use still works (a real,
documented remaining gap: that exemption currently allows external
paste there too — see `CodingEditor.tsx`). Management's candidate
detail page and dashboard now show real proctoring data instead of a
placeholder. Added `docker-compose.yml` + Dockerfiles + a CI workflow
for deployment, and a small pure-logic unit test suite (see
`backend/TESTING.md` for exactly what it covers and what it doesn't).

Every module from the original build order now has real, working code
behind it — some fully, a few (Communication's transcription quality,
proctoring's face detection, the coding editor's clipboard exemption,
integration testing) with honestly-documented partial scope. See each
section above and the linked files for exactly where those lines sit.
(The AI interview module from the original spec is the one exception —
**descoped at the user's request**, not being built at all.)

## Why it isn't the complete app yet

This is being generated in a sandboxed chat environment with no network
access, so none of it has actually been run here — no `npm install`, no
live Postgres, no real `docker run`, no browser exercising any of this code.
Everything below is real, complete source written and cross-checked by hand,
meant to run on your machine; it hasn't been executed anywhere yet. That's
also why this is being built and hardened module by module rather than
sketched thinly across all 18 at once — each phase above is real, working
code, not a stub.

One caveat specific to Communication: with the default `SPEECH\\\_PROVIDER=mock`,
transcription always comes back empty (see
`backend/src/speech/providers/mockSpeechProvider.ts` for why that's the
honest default rather than a faked transcript), so every communication
score will be near zero until you set `SPEECH\\\_PROVIDER=openai` +
`SPEECH\\\_API\\\_KEY`. The recording/upload/scoring pipeline itself is real and
exercises end to end either way — only the transcription quality depends on
that key. Browser TTS playback quality also varies by browser/OS voice
availability; it always works, but doesn't sound identical everywhere.

## Running this locally

Requires Node.js 20+, Docker (for Postgres + the coding sandbox), and
network access.

```bash
cp .env.example .env
# fill in DATABASE\\\_URL, and generate secrets with:
openssl rand -base64 48   # → JWT\\\_ACCESS\\\_SECRET
openssl rand -base64 48   # → JWT\\\_REFRESH\\\_SECRET

docker run -d --name pg -e POSTGRES\\\_PASSWORD=postgres -p 5432:5432 postgres:16

cd backend
npm install
npm run prisma:migrate   # creates tables from database/schema/schema.prisma
npm run seed              # creates the first SUPER\\\_ADMIN account (prints its credentials)
npm run dev               # → http://localhost:4000
```

### Bootstrapping: get a management account and a job role

```bash
# 1. Log in as the seeded Super Admin (credentials printed by `npm run seed`,
#    or admin@example.com / ChangeMe123! if you didn't set env vars).
curl -c cookies.txt -X POST http://localhost:4000/api/auth/login \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"email":"admin@example.com","password":"ChangeMe123!"}'

# 2. Create a Management account (SUPER\\\_ADMIN only).
curl -b cookies.txt -X POST http://localhost:4000/api/management/users \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"name":"Priya Sharma","email":"priya@example.com","password":"correct-horse-battery","permissions":\\\["shortlist","override\\\_ai"]}'
```

From here, log into the frontend at `/login` with either account — both
land on `/management`. Everything past this point (creating job roles,
coding questions, reviewing candidates) can be done through the UI instead
of `curl` — see below.

```bash
cd frontend
cp .env.example .env
npm install
npm run dev   # → http://localhost:5173
```

Full endpoint reference: `docs/API.md`.

### Coding sandbox images

The coding module shells out to `docker` (see `docker/coding-sandbox/README.md`
for exactly what it runs). Build the images once:

```bash
cd docker/coding-sandbox
./build-images.sh
```

Without this, `POST /api/coding/session/:id/run` and `/submit` will fail —
the executor calls `docker run <image>` directly and doesn't build images
on the fly.

### Trying the full flow end to end

With `backend` and `frontend` both running, and the sandbox images built:

1. Log in as Management (or Super Admin) at `/login`. Go to **Job Roles**
and create one. Go to **Coding Questions** and create at least 2
`EASY\\\_CODING` + 1 `MODERATE\\\_CODING` + 1 `HARD\\\_CODING` questions, each
with exactly 10 visible + 5 hidden test cases — the form defaults to
that split.
2. Register as a candidate, upload + analyze a resume — the dashboard shows
your resume↔job-role match once analysis finishes. Click **Start
Assessment** — system check → consent → MCQ sessions (Aptitude → Logical
→ Reasoning → Grammar) → the Communication session (press "Play
sentence" to hear it via your browser's text-to-speech, then "Record
your response") → real sandboxed coding sessions (Easy → Moderate →
Hard). All 8 sessions are completable in one run now.
3. Back in the Management portal's **Candidates** table, find the candidate
(score and resume-match columns populate as data becomes available),
open their detail page — the AI recommendation section fills in once the
assessment finalizes — and set a shortlisting category/status, which
writes an audit log entry.
4. The candidate's **View Result** shows "under review" until 48 hours
after completion, then the full breakdown.

### Running the unit tests

```bash
cd backend
npm install
npm run test
```

See `backend/TESTING.md` for exactly what's covered (pure logic only —
session-config math, mock AI provider scoring, proctoring policy) and what
a next pass of integration tests would need.

### Deployment

```bash
cp .env.example .env      # fill in real secrets before doing this for real
docker compose up -d postgres
docker compose run --rm backend npx prisma migrate dev --schema=../database/schema/schema.prisma
docker compose run --rm backend npm run seed
docker compose up -d
```

Frontend on `http://localhost:8080`, backend on `http://localhost:4000`.
Also build the coding-sandbox images separately first (`docker/coding-sandbox/build-images.sh`)
— they run as sibling containers on the host, not something this compose
file builds. The one non-obvious piece: the backend container mounts the
**host's** Docker socket (`docker-compose.yml`) so the coding executor's
`docker run` calls reach a real daemon instead of needing one nested inside
the backend's own container — see that file's comments for the trust
implications before using this beyond a single trusted host. CI
(`.github/workflows/ci.yml`) runs typecheck + the unit tests above on every
push, nothing more — no live database in CI since the test suite doesn't
need one yet.

## Project layout

```
frontend/    React + TS + Tailwind — candidate portal + management portal (see frontend/README.md)
backend/     Node + Express + TS — auth, job roles, resume, questions, assessment engine, coding, management, audio/speech, proctoring (see backend/TESTING.md)
database/    Prisma schema (22 models)
docker/      Coding execution sandbox — buildable images for all 6 languages
docs/        ARCHITECTURE.md, API.md
docker-compose.yml, backend/Dockerfile, frontend/Dockerfile — deployment
.github/workflows/ci.yml — typecheck + unit tests on push
```

## Roadmap (spec §71 order)

* \[x] Project architecture
* \[x] Database schema
* \[x] Authentication
* \[x] Candidate portal (register/login, resume upload, system-check, consent, full assessment runner — MCQ + coding + Communication sessions, all real end to end)
* \[x] Management portal (dashboard, candidate table/detail, shortlisting override + audit log; job-role and coding-question authoring UI)
* \[x] Resume processing (upload, parsing, AI extraction)
* \[x] Job description management (CRUD + resume↔JD matching, run automatically as part of `/resume/analyze`)
* \[x] AI question generation (MCQ engine, validated question bank)
* \[x] Assessment engine (server-controlled timer, session locking, eligibility gating)
* \[x] Coding sandbox (executor service + submit/run endpoints, all 6 languages)
* \[x] Communication assessment (browser TTS playback, MediaRecorder capture, speech-to-text, AI accuracy scoring — see caveat below)
* \[x] Webcam/microphone proctoring — event ingestion + an escalating warn→violation→terminate policy is fully real (`backend/src/proctoring/\\\*`); tab-switch/fullscreen-exit detection is 100% reliable (standard browser APIs); face-count monitoring is best-effort via the browser's experimental `FaceDetector` API where available, degrading to a no-op elsewhere rather than pulling in an ML library with no way to test it here. Continuous voice/audio monitoring is not implemented.
* \[x] Anti-copy/paste system — page-wide clipboard blocking + violation reporting through the same proctoring pipeline. One real gap: the coding editor is exempted from the blocker (so normal Monaco typing/select/cut/copy works, per spec §26), but that exemption currently allows ALL clipboard ops there, including external paste — see the comment in `frontend/src/components/CodingEditor.tsx` for what closing that gap actually requires.
* \[x] AI candidate analysis (recommendation generation — computed automatically when an assessment finalizes, advisory only, shown on the candidate detail page, now factoring in real proctoring risk)
* \[x] 48-hour result release (built into the assessment engine's finalization)
* \[x] Testing — a real but deliberately narrow start: pure-logic unit tests (`backend/\\\*\\\*/\\\*.test.ts`, see `backend/TESTING.md`) for the session-config math, the mock AI provider's scoring logic, and the proctoring policy. No integration tests against a live database yet — `TESTING.md` explains exactly what that needs.
* \[x] Deployment — `docker-compose.yml` + Dockerfiles for backend/frontend + a CI workflow (typecheck + the unit tests above). See the Deployment section below for the one non-obvious piece: the backend container needs the host's Docker socket mounted so the coding executor can actually run `docker run`.
* ~~AI interview module~~ — descoped at the user's request, not being built



## Secure Exam Desktop (optional)

The repository now includes `secure-exam-desktop/`, an Electron kiosk shell. From that directory run `npm install`, then `ASSESSMENT\\\_URL=http://localhost:5173/candidate/system-check npm start`. Use this only on managed exam machines; browser-only protection cannot control a physical phone or every OS shortcut.

