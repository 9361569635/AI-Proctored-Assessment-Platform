# Frontend

React + TypeScript + Tailwind, talking to the backend in `../backend`.

## What's built

**Candidate side:**
- **Auth**: `pages/auth/{Register,Login}.tsx`, session handled by
  `hooks/useAuth.tsx` (calls `/auth/me` on load, silent-refresh on 401 via
  `services/apiClient.ts`). Login routes to `/candidate` or `/management`
  depending on the logged-in user's role.
- **Resume**: `components/ResumeUpload.tsx` — upload, trigger AI analysis
  (including the resume↔job-role match), show extracted skills.
- **Assessment flow**: `pages/candidate/{SystemCheck,Consent,AssessmentRunner,Result}.tsx`
  — camera/mic/fullscreen/browser checks → consent → the assessment itself,
  server-synced timers throughout:
  - `components/assessment/McqSessionView.tsx` — Aptitude/Logical/Reasoning/Grammar
  - `components/assessment/CommunicationSessionView.tsx` — browser
    text-to-speech plays the reference sentence, `MediaRecorder` captures
    the response, uploads and shows back the transcript + accuracy
  - `components/assessment/CodingSessionView.tsx` + `components/CodingEditor.tsx`
    — Monaco editor, working Submit/Run against the real sandbox
  - then a result page respecting the 48-hour release gate
- `pages/candidate/Dashboard.tsx` ties it together: resume status gates the
  **Start Assessment** button, which then branches to Resume/View-Result
  depending on current assessment status.

**Management side:**
- `pages/management/Dashboard.tsx` — status cards + score/session/coding averages.
- `pages/management/Candidates.tsx` — searchable/filterable candidate table,
  including the resume-match column (spec §48).
- `pages/management/CandidateDetail.tsx` — resume + JD match, session/coding
  score breakdown, coding submissions (source code + pass/fail counts —
  never hidden test case content), the AI recommendation (once an
  assessment finalizes), and the shortlisting override form (category +
  final status + comment, saved via `PUT /management/candidates/:id/status`).
- `pages/management/JobRoles.tsx` — list + create form.
- `pages/management/CodingQuestions.tsx` — list + create form (defaults to
  the required 10-visible/5-hidden test case split).
- `layouts/ManagementLayout.tsx` — nav shell.

There's no login page specific to management — it's the same `/login` as
candidates; the backend just checks the account's role.

## Not built yet

- Anti-copy/paste enforcement in the coding editor — see the comment at the
  bottom of `components/CodingEditor.tsx` for exactly where this hooks in.
- Webcam/mic **continuous monitoring** during the assessment (the
  system-check page only verifies camera/mic *access* up front, once — it
  doesn't stream or analyze video/audio during the assessment itself).
- The AI interview module — descoped at the user's request, not being built.

## Running it

```bash
cp .env.example .env   # VITE_API_URL, defaults to http://localhost:4000/api
npm install
npm run dev             # → http://localhost:5173
```

Needs the backend running, seeded (`npm run seed` in `../backend` — creates
the first Super Admin account), and, for the coding sessions, the sandbox
images built (`../docker/coding-sandbox/build-images.sh`). See the root
`README.md` for the full bootstrap walkthrough and the Communication
session's speech-to-text caveat (transcription is a no-op placeholder
until `SPEECH_PROVIDER=openai` is configured on the backend).
