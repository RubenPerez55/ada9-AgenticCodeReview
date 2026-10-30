# Independent Review Report

## Review Context
Change ID: CR-02
Branch / PR: ada09/cr-02 → main (PR candidate; diff in `results/pr.diff`, confirmed byte-identical to `git diff main..847bcdf`)
Commit reviewed: 847bcdf76d4f166c77a38397ed368e21fda15523 ("feat: implement CR-02")
Reviewer agent: Claude (Cowork) independent sub-agent
Model: claude-opus-5-5
Tools / permissions: Read-only on code/tests/docs/config. Used git log/diff/show, grep, read-only `node -e` probes (service functions and the app in-process on port 0), `./scripts/verify_repo.sh`. Wrote only `results/review-contract.md` and `results/review-report.md`. No commits.

## Requirements Reviewed
- FR-07
- AC-07.1, AC-07.2, AC-07.3, AC-07.4, AC-07.5, AC-07.6
- NFR-01, NFR-02, NFR-03 (and the CR-02 constraint that FR-06 `min_rating` and the frontend do not change)

Contract: `results/review-contract.md`.

## Verification Evidence Reviewed
- `results/verification-report.md`: tests 70/70, lint 0 problems, `REPO_CONTRACT: PASS`, `SECURITY_CHECK: PASS`, `VERIFY_REPO: PASS`.
- Re-ran `./scripts/verify_repo.sh` myself: `# tests 70 / # pass 70 / # fail 0`, `REPO_CONTRACT: PASS`, `SECURITY_CHECK: PASS`, `VERIFY_REPO: PASS`.
- `git diff main..HEAD -- REQUIREMENTS.md SPEC.md backend/data frontend backend/package.json` → 0 lines (no protected files, frontend or dependencies touched).
- `git diff main..HEAD backend/test | grep '^-'` → only the `api.test.js` header comment line was removed (it was extended). No existing test weakened, skipped or deleted.
- All called APIs exist: `parseSortBy` and `sortMovies` are defined in `backend/services/movieService.js:106` and `:130` and exported at `:288-289`. They are imported in `backend/app.js:8-9`. No new dependencies.
- Architecture: `app.js:42-53` only reads `req.query.sort_by`, calls `parseSortBy`, maps `!valid` to `400 { error }`, then calls `sortMovies(filterMovies(...))`. Validation returns `{ valid, value, error }` per ARCHITECTURE.md "Business-Rule Location". The services file adds no `express`/`http`/`fs` imports (the repo contract check passes).
- Independent behavior probes (app in-process, real fixture of 16 movies):
  - `sort_by=rating` → `13:8.7, 14:8.7, 9:8.5, 4:8.4, 7:8.4, 8:8.4, 1:8.2, 6:8.1, 3:7.7, 2:7.6, 15:7.6, 10:7.3, 5:7.1, 12:7.1, 11:7, 16:5.6`. This is descending, and every tie group (8.7, 8.4, 7.6, 7.1) is in catalog id order (AC-07.1, AC-07.3).
  - `genre=all&sort_by=release_date` → strictly newest first, from 2024-11-27 down to 1972-03-14 (AC-07.2, AC-07.6).
  - `min_rating=8&sort_by=release_date`, `sort_by=rating&min_rating=8.4` (inclusive boundary kept), and `category=TOP_RATED&sort_by=rating` → filtered, then sorted correctly (AC-07.6; FR-06 unchanged).
  - These all return 400 with the Spanish `sort_by` error: `sort_by[]=rating`, `sort_by[a]=rating`, `sort_by=__proto__`, `sort_by=hasOwnProperty`, `sort_by=rating%00`, `sort_by=%20rating`, bare `sort_by`, `sort_by=` (AC-07.4).
  - `min_rating=abc&sort_by=title` and `min_rating=11&sort_by=rating` → 400 with the `min_rating` error.
  - `search=zzzz&sort_by=rating` → 200 `[]`.
  - `Sort_By=title` → 200 in catalog order. Parameter names are case-sensitive, so this counts as an absent `sort_by` (AC-07.5).
  - After the sorted requests, `GET /api/movies` still deep-equals `movies.json` (NFR-02).
  - Service: a 2000-element array with heavy ties keeps tie order (stable). `sortMovies([null, {...}, undefined], 'rating')` does not throw and puts invalid entries last.

## Findings

### RF-01 — SHOULD FIX
Category: test-coverage / false confidence
Requirement / AC: AC-07.6 ("combines with all FR-01 / FR-06 filters"); AC-07.1 unit test
File / Line: `backend/test/api.test.js:209-213`; `backend/test/movieService.test.js:194`, `:216`, `:222-225`
Evidence:
- The HTTP search-combination check uses `term = catalog[0].title` ("Dune: Parte Dos"). A read-only probe shows that this search matches exactly 1 movie, so the `expectedOrder(searched, 'vote_average')` assertion is satisfied by any ordering.
- The unit search combination (`search: 'zzz-sin-coincidencias'`) returns `[]`, which is trivially "sorted".
- In the unit test, `mockMovies` is already in descending `vote_average` order (8.2, 7.6, 5.6, 4.2 at lines 22/32/42/52). So `sortMovies(mockMovies,'rating')` → `[1,2,3,4]` (line 194) and the filtered rating assertion `[1,2,3]` (line 216) also pass with a no-op sort.
Problem: The `search` + `sort_by` combination required by AC-07.6 is never checked with more than one result, at either level. Several "rating" assertions cannot tell a working sort from no sort.
Risk: Low today. The production path is a single `sortMovies(filterMovies(...))` call, and other assertions (the `tieMovies` fixture, the HTTP `category`/`genre`/`min_rating` combos) do catch a no-op or wrong sort. The risk is that the suite gives more confidence than it earns for the search path, and a future refactor of how search composes with sorting would go undetected.
Recommended next step: Use a search term that matches at least 2 catalog movies in a non-sorted catalog order (for example a common substring of `overview`), and assert the sorted ids. In the unit suite, add a search case with at least 2 results whose input order differs from the sorted order.

### RF-02 — OPTIONAL
Category: correctness (out-of-fixture data) / doc–code consistency
Requirement / AC: AC-07.2 (robustness beyond the current fixture; not a violation)
File / Line: `backend/services/movieService.js:125`, `:139-141`, `:151-152`
Evidence:
- The JSDoc at line 125 says movies "sin valor válido en el campo de orden quedan al final". However, the `release_date` validity predicate is `v => typeof v === 'string' && v.length > 0`, so any non-empty string counts as valid.
- Probe: `sortMovies([{id:1,release_date:"not-a-date"},{id:2,release_date:"2024-01-10"}],"release_date")` → `[1, 2]`. The malformed date sorts first, not last.
- Probe: `sortMovies([{id:1,release_date:"2024-1-5"},{id:2,release_date:"2024-01-10"}],"release_date")` → `[1, 2]`. This is lexicographic order, not chronological.
- `validateMovie` (line 267) enforces `^\d{4}-\d{2}-\d{2}$`, but it is not applied when the catalog loads. All 16 fixture dates are well-formed, so there is no impact today.
Problem: The comparator's "valid key" rule for dates is weaker than its own documented contract and than the catalog's date format rule.
Risk: Only if non-`YYYY-MM-DD` data enters the catalog. Today `movies.json` is protected and well-formed.
Recommended next step: Optionally make the date predicate use the same `YYYY-MM-DD` regex as `validateMovie`, so malformed dates go last, and add one unit case. Otherwise, reword the JSDoc to describe the actual behavior.

### RF-03 — OPTIONAL
Category: test design (oracle independence)
Requirement / AC: AC-07.1, AC-07.2, AC-07.6 (HTTP)
File / Line: `backend/test/api.test.js:125-132`
Evidence: The comment says "Orden esperado calculado de forma independiente". However, `expectedOrder` uses the same `===`-then-`>` comparison as the production comparator (`movieService.js:150-152`), plus an index tiebreak.
Problem: The oracle partly duplicates the implementation logic, so a shared misconception (for example string comparison of dates) would pass on both sides. This is mitigated: AC-07.1 and AC-07.2 also assert pairwise monotonicity (`api.test.js:140`, `:150`), and AC-07.3 checks tie groups directly against catalog order.
Risk: Minimal with the current fixture.
Recommended next step: Optionally replace the `expectedOrder` assertions with hard-coded expected id lists for the fixture, or compare dates with `Date.parse`.

### RF-04 — OPTIONAL
Category: documentation accuracy
Requirement / AC: AGENTS.md Definition of Done (report accuracy)
File / Line: `results/coder-report.md:123`
Evidence: The report says "Nothing has been committed. The changes are left in the work tree for independent review." However, the report itself and all code changes are in commit `847bcdf` ("feat: implement CR-02").
Problem: The evidence artifact is stale and inconsistent with the git history.
Risk: Confusing for the human reviewer's audit trail. There is no functional impact.
Recommended next step: Update the statement, or note who committed and when (for example "committed by the orchestrator/human as 847bcdf after the coder run").

## Missing Evidence / Open Questions
- Error precedence when both `min_rating` and `sort_by` are invalid: `min_rating` is validated first (`app.js:37-45`), so its message wins. SPEC.md does not define this, and both cases return 400 `{ error }`, so it is acceptable. A human may want to confirm it or record it in SPEC.
- AC-07.3 for `release_date` is only checked at unit level (`movieService.test.js` `tieMovies`). The fixture has no `release_date` ties (probe: "date ties []"), so it cannot be checked over HTTP without editing the protected fixture. Unit coverage is sufficient.
- REQUIREMENTS.md still marks FR-07 "(Planned)". Changing it is a protected human action, as was done for FR-06.
- I did not inspect CI workflow files (`.github/workflows/`). My verification relies on the local `verify_repo.sh` run.

## Summary
MUST FIX: 0
SHOULD FIX: 1 (RF-01)
OPTIONAL: 3 (RF-02, RF-03, RF-04)

All AC-07.1 … AC-07.6 are implemented and behave correctly under independent probing. Architecture boundaries, NFR-02 non-mutation, FR-06 behavior and protected paths are intact. No hallucinated APIs or new dependencies.

## Reviewer Recommendation
[ ] NOT READY
[ ] READY AFTER MUST FIX
[x] READY FOR HUMAN REVIEW

RF-01 should ideally be addressed before merge, but it does not block the requested behavior.

This recommendation is not a merge approval.
