# Change Request

Change ID: CR-02

## Goal
Add the optional `sort_by` query parameter to `GET /api/movies` so clients can order listings by rating or by release date, after filtering.

## Requirements Covered
- FR-07
- AC-07.1
- AC-07.2
- AC-07.3
- AC-07.4
- AC-07.5
- AC-07.6

## Constraints
- Follow AGENTS.md.
- Use REQUIREMENTS.md and SPEC.md as the source of truth.
- Preserve architecture boundaries (sorting and `sort_by` validation in `backend/services/`, HTTP mapping in `backend/app.js`).
- Do not weaken existing tests.
- Do not change `min_rating` (FR-06) behavior or the frontend.

## Verification
- Unit and HTTP tests named after AC-07.1 … AC-07.6 pass.
- `GET /api/movies?sort_by=rating` returns movies ordered by `vote_average` descending, ties in catalog order.
- `GET /api/movies?sort_by=release_date` returns newest first.
- `GET /api/movies?sort_by=title` returns HTTP 400 `{ error }`.
- `GET /api/movies` without `sort_by` returns the catalog in its original order.
- `./scripts/verify_repo.sh` ends with `VERIFY_REPO: PASS`.

## Human Approval
Approved to implement: YES
Approved by: Ruben Perez
Date: 2026-10-30
