# Testing

## What's covered

Pure-logic unit tests only, colocated as `*.test.ts` next to the code they
test, run with `npm run test` (vitest):

- `src/assessment/assessmentConfig.test.ts` — the session sequence's marks
  add up to 100, eligibility thresholds match spec §8-12, coding sessions
  correctly have no per-session timer.
- `src/ai/providers/mockProvider.test.ts` — the mock AI provider's
  deterministic logic: resume keyword extraction, job-match scoring,
  communication word-overlap scoring, candidate-analysis recommendation
  logic (including that a high proctoring risk caps the recommendation).
- `src/proctoring/proctoringConfig.test.ts` — every event type has a policy
  with strictly-increasing warn/violation/terminate thresholds.

These were chosen specifically because they're **pure functions with no
database, network, or filesystem dependency** — the only category of test
this environment could write with real confidence, since nothing here has
actually been executed (no live Postgres, no `vitest run` has ever been
invoked). Everything else in the codebase touches Prisma, which needs a
real database connection to test meaningfully.

## What's not covered (and why)

Spec §67 asks for coverage across auth, resume, assessment, coding,
security, and proctoring — most of that is business logic sitting directly
on top of Prisma queries (registration, session state transitions, coding
submission scoring, proctoring event ingestion). Testing that properly
needs one of:

- **Integration tests against a real test database** — spin up Postgres
  (the `docker-compose.yml` `postgres` service works for this), run
  migrations into it, and test the actual service functions end to end.
  This is the natural next step; none of the `*.service.ts` files were
  written to be hard to test this way — they're already just functions
  that take plain arguments and return plain objects, no request/response
  coupling.
- **Mocking Prisma** — faster, but `prisma migrate + docker-compose` isn't
  a heavy lift, so integration tests are the better default here.
- **API-level tests** (`supertest` against the Express app) — most direct
  path to spec §67's actual test list ("registration", "unauthorized
  access", "session progression", "hidden test cases", ...), but needs the
  same real-database dependency underneath.

None of these are in this build. Adding them means: pick one approach
above, add the CI workflow a `postgres:` service container (see
`docker-compose.yml`'s service definition for the connection shape), and
start with the highest-value paths — the assessment engine's session
state machine and the coding sandbox's scoring are the two areas where a
regression would be both easy to introduce and hard to notice by hand.

## Frontend

No frontend test setup exists yet (would need `vitest` + `@testing-library/react`
+ `jsdom` added to `frontend/package.json`, none of which are there now).
