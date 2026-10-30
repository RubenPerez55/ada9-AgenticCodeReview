# PR Evidence

## Change
Change ID: CR-02 — `sort_by` for `GET /api/movies`
PR / Branch: `ada09/cr-02` → `main` (local PR candidate: `results/pr.diff`)
Base commit: `4e7ffb1`
Final commit: `b0b7535` (code) — evidence commits follow on the same branch

## Requirements / Acceptance Criteria
- FR-07
- AC-07.1, AC-07.2, AC-07.3, AC-07.4, AC-07.5, AC-07.6

## Implementation
Coder report: `results/coder-report.md` (includes Fix Cycle section)
Files changed: `backend/services/movieService.js`, `backend/app.js`, `backend/test/movieService.test.js`, `backend/test/api.test.js`, `TASKS.md`
Commits (`results/commits.txt`):
- `847bcdf` feat: implement CR-02
- `ce140ae` docs: verification, review contract, independent review, human decisions
- `b0b7535` fix: address ADA-09 review findings

## Verification
Verification command: `./scripts/verify_repo.sh`
Final result: `VERIFY_REPO: PASS` (`results/verification-report.md`, re-verification section)
Tests: 74/74 pass (main: 46 → candidate: 70 → after fixes: 74)
Lint: PASS (ESLint, 0 problems)
Security / repo checks: `REPO_CONTRACT: PASS`, `SECURITY_CHECK: PASS`

## Independent Review
Review report: `results/review-report.md` (contract: `results/review-contract.md`)
MUST FIX found: 0
SHOULD FIX found: 1 (RF-01)
OPTIONAL found: 3 (RF-02, RF-03, RF-04)

## Human Decisions
`results/human-review-decisions.md`
Accepted: RF-01
Modified: RF-02 (OPTIONAL → SHOULD FIX)
Rejected: RF-03 (risk already covered by fixed-order assertions), RF-04 (reviewer misread who committed)
Deferred: none

## Re-review
`results/re-review-report.md`
Resolved: RF-01, RF-02
Partially resolved: none
Not resolved: none
New MUST FIX: none

## Traceability

| Requirement / AC | Task / Change | Code | Test | Review Finding |
|---|---|---|---|---|
| AC-07.1 rating desc | T-07 / CR-02 | `movieService.js:135` `sortMovies`, `:94` `SORT_FIELDS` | `api.test.js:134`; `movieService.test.js:193`, `:247` | RF-01 (fixture already ordered) → resolved |
| AC-07.2 release_date desc | T-07 / CR-02 | `movieService.js:135`, `:102` `RELEASE_DATE_PATTERN` | `api.test.js:145`; `movieService.test.js:199`, `:247`, `:264` | RF-02 (invalid dates sorted first) → resolved |
| AC-07.3 stable ties | T-07 / CR-02 | `movieService.js:135` (stable `Array.prototype.sort`) | `api.test.js:155`; `movieService.test.js:203` | RF-03 rejected |
| AC-07.4 invalid → 400 | T-07 / CR-02 | `movieService.js:111` `parseSortBy`; `app.js:42` | `api.test.js:171`, `:181`; `movieService.test.js:304` | — |
| AC-07.5 absent → catalog order | T-07 / CR-02 | `movieService.js:135`; `app.js:53` | `api.test.js:188`; `movieService.test.js:208`, `:295` | — |
| AC-07.6 after filters | T-07 / CR-02 | `app.js:42-53` (filter → sort) | `api.test.js:194`, `:216`, `:230`; `movieService.test.js:214`, `:257` | RF-01 (search case with 1 result) → resolved |

## Remaining Risks / Technical Debt
- `RELEASE_DATE_PATTERN` checks format only; impossible dates (e.g. `2024-13-45`) are accepted, consistent with `validateMovie`. Accepted as known debt.
- Precedence when both `min_rating` and `sort_by` are invalid is not specified in SPEC.md (both return 400; `min_rating` message wins).
- Only descending order; frontend does not expose `sort_by` (out of scope for CR-02).

## Final Human Decision
[ ] NOT READY
[x] READY FOR HUMAN MERGE

Approved by: Ruben Perez
Date: 2026-10-30
