# Review Contract

## Change
CR-02 — optional `sort_by` query parameter on `GET /api/movies` (sort by rating or release date, applied after filtering).

Sources: CHANGE_REQUEST.md, REQUIREMENTS.md (FR-07, NFR-01..03), SPEC.md (Conventions; GET /api/movies table), ARCHITECTURE.md, AGENTS.md.

## Requirements / Acceptance Criteria
- FR-07: `GET /api/movies` accepts an optional `sort_by` query parameter.
- AC-07.1: `sort_by=rating` → results ordered by `vote_average` descending.
- AC-07.2: `sort_by=release_date` → results ordered by `release_date` descending (newest first).
- AC-07.3: ties keep the original catalog order (stable sort).
- AC-07.4: any other `sort_by` value → HTTP 400 `{ error }` (SPEC: Spanish message, no partial results; empty string and repeated parameter are invalid per SPEC conventions).
- AC-07.5: `sort_by` absent → original catalog order (FR-01 unchanged).
- AC-07.6: `sort_by` combines with all FR-01 / FR-06 filters (`category`, `genre`, `search`, `min_rating`); sorting applied after filtering.
- NFR-01: business rules are pure functions in `backend/services/` with unit tests.
- NFR-02: the in-memory catalog is never mutated by a request.
- NFR-03: existing endpoints remain backward compatible (including FR-06 `min_rating` behavior, which CR-02 must not change).

## Architecture Constraints
- Expected dependency flow: `server.js → app.js → services/`; never the reverse. Services must not require `express`, `http`, `fs`, `app.js` or `server.js`.
- Business-rule location: `sort_by` parsing/validation and the sorting itself live in `backend/services/` as pure functions; validation returns `{ valid, value, error }`; `app.js` only reads `req.query`, calls services and maps an invalid result to `400 { error }`.
- Protected boundaries: `backend/data/movies.json`, `REQUIREMENTS.md`, `.github/workflows/`, `.env*`/credentials must not change; SPEC.md must not be edited to fit code; frontend must not change (CR-02 constraint); existing tests must not be weakened, skipped or deleted; no new dependencies without justification.
- Tests: unit tests in `backend/test/movieService.test.js`, HTTP tests in `backend/test/api.test.js`, named after the AC they verify (AC-07.1 … AC-07.6).
- Definition of done: `./scripts/verify_repo.sh` ends with `VERIFY_REPO: PASS`; TASKS.md T-07 updated; change scoped to CR-02.

## Review Rules
- Verify requirement coverage.
- Verify every called API/dependency exists.
- Check architecture boundaries.
- Inspect tests for masking / false confidence.
- Check regression behavior.
- Identify unnecessary technical debt.
- Cite evidence for every finding.

## Severity
MUST FIX:
Requirement violation, regression, security/integrity risk,
hallucinated API/dependency, broken architecture constraint,
or defect that makes the change unsafe to approve.

SHOULD FIX:
Significant maintainability, coverage, design, or clarity issue
that does not block the requested behavior.

OPTIONAL:
Non-blocking improvement outside the minimum acceptance threshold.
