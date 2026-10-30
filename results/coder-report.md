# Coder Agent Report

## Change
Change ID: CR-02
Branch: ada09/cr-02
Base commit: 1085cfa ("docs: add approved CHANGE_REQUEST CR-02")

## Requirements Covered
- FR-07
- AC-07.1
- AC-07.2
- AC-07.3
- AC-07.4
- AC-07.5
- AC-07.6
- NFR-01, NFR-02 and NFR-03 are respected: the logic is in pure service functions, the catalog is never mutated, and existing behavior is unchanged when `sort_by` is absent.

## Implementation Plan
Written before coding, after reading AGENTS.md, CHANGE_REQUEST.md, REQUIREMENTS.md (FR-07), SPEC.md, ARCHITECTURE.md, TASKS.md, `backend/app.js`, `backend/services/movieService.js` and both test files:
1. `backend/services/movieService.js`:
   - Add `parseSortBy(raw)`, which returns `{ valid, value, error }` in the same way as `parseMinRating` (ARCHITECTURE.md "Business-Rule Location").
     - Accepted values are exactly `rating` and `release_date`.
     - If the parameter is absent it returns `{ valid: true, value: null, error: null }`.
     - Any other value is invalid and comes with a Spanish error message. This includes an empty string, different casing, a repeated parameter (array) and non-string values.
   - Add `sortMovies(movies, sortBy)`, a pure, stable, descending sort.
     - It always returns a new array (NFR-02).
     - With no `sortBy`, or an unknown one, it returns a copy in the original order.
     - `rating` sorts by `vote_average`. `release_date` sorts by `release_date`, compared as `YYYY-MM-DD` strings.
2. `backend/app.js`: call `parseSortBy(req.query.sort_by)` and map an invalid result to `400 { error }`. Then call `sortMovies(filterMovies(...), sortBy.value)`, so sorting happens after filtering (AC-07.6). No business rules go in `app.js`.
3. Tests:
   - Unit tests for `sortMovies` and `parseSortBy` in `backend/test/movieService.test.js`.
   - HTTP tests in `backend/test/api.test.js`.
   - Every test is named after the AC it verifies (AC-07.1 to AC-07.6), plus NFR-02 non-mutation tests.
4. Update the TASKS.md T-07 row, run `./scripts/verify_repo.sh` and write this report.

## Files Changed
- `backend/services/movieService.js`:
  - Added the `SORT_FIELDS` map, `parseSortBy(raw)` and `sortMovies(movies, sortBy)`.
  - Exported both new functions.
- `backend/app.js`:
  - Imported `parseSortBy` and `sortMovies`.
  - `GET /api/movies` now validates `sort_by` (invalid ⇒ 400 `{ error }`) and sorts the filtered results.
  - Updated the route comment.
- `backend/test/movieService.test.js`: imported the new functions and added the `sortMovies()` and `parseSortBy()` suites.
- `backend/test/api.test.js`: added the `API: GET /api/movies?sort_by (FR-07)` suite and updated the header comment.
- `TASKS.md`: T-07 row set to "Done (pending review)" with its code and test references.
- `results/coder-report.md`: this report.

Not modified: REQUIREMENTS.md, SPEC.md, `backend/data/movies.json`, the frontend, `min_rating` (FR-06) logic and package dependencies.

## Tests Added / Updated
No existing test was removed, skipped or weakened. The only line removed from test files is the header comment of `api.test.js`, which was extended.

Unit tests (`backend/test/movieService.test.js`):

`sortMovies()`:
- AC-07.1: sorts by `vote_average`, descending.
- AC-07.2: sorts by `release_date`, newest first.
- AC-07.3: stable ordering of ties for both keys, checked with a dedicated fixture that has ties.
- AC-07.5: with no `sortBy` (absent, `null` or `undefined`), the original order is kept.
- AC-07.6: sorting is applied after `filterMovies` (category with `minRating`, genre, and search with no matches).
- Movies with a missing or invalid sort value go last, in their original order.
- Invalid inputs (`null`, non-array) return `[]` without throwing.
- NFR-02: the input array is not mutated and a new array is returned.

`parseSortBy()`:
- AC-07.5: an absent parameter is valid and has no effect.
- AC-07.1 / AC-07.2: `rating` and `release_date` are accepted.
- AC-07.4: these are rejected:
  - `title`, `''` and `' '`
  - `RATING` and `Rating` (casing)
  - values with leading or trailing spaces
  - `release-date` and `vote_average`
  - `toString` and `__proto__` (inherited object keys)
  - arrays (repeated parameter), objects, `null` and numbers

HTTP tests (`backend/test/api.test.js`, suite `API: GET /api/movies?sort_by (FR-07)`):
- AC-07.1: `sort_by=rating` returns the full catalog ordered by `vote_average`, descending, matching an independently computed stable order.
- AC-07.2: `sort_by=release_date` returns newest first and matches the independently computed order.
- AC-07.3: for each `vote_average` tie group in the fixture, response order equals catalog order. The test also asserts that tie groups exist.
- AC-07.4: 400 `{ error }` with no `results` or `total_results` for `title`, `''`, `RATING`, `vote_average` and `release-date`, and for a repeated `sort_by`.
- AC-07.5: without `sort_by`, the response equals the catalog in its original order.
- AC-07.6 (filters): `category`, `genre`, `min_rating` and `sort_by=rating` combined; `category` with `sort_by=release_date`; `search` with `sort_by=rating`.
- AC-07.6 (invalid filter): an invalid `min_rating` with a valid `sort_by` still returns 400.
- NFR-02: after sorted requests, `GET /api/movies` still returns the catalog in its original order.

Result: 70 tests pass, 0 fail (the whole suite, including the existing tests).

## Commands Executed
```
git status; git log --oneline -3
cat AGENTS.md CHANGE_REQUEST.md results/run-context.md
cat REQUIREMENTS.md SPEC.md ARCHITECTURE.md TASKS.md
cat backend/app.js backend/services/movieService.js backend/test/api.test.js backend/test/movieService.test.js
cat scripts/verify_repo.sh scripts/check_repo_contract.js package.json
node -e "<print id, vote_average, release_date, title of backend/data/movies.json>"   # read-only inspection of fixture ties
python3 - <<EOF ... EOF   # applied the source/test/TASKS.md edits (in-place string replacements)
./scripts/verify_repo.sh
git diff --stat; git diff backend/app.js; git diff backend/test | grep '^-'
```

## Verification Result
`./scripts/verify_repo.sh` printed:
- `[1/4] Tests`: 70 tests, 70 pass, 0 fail
- `[2/4] Lint`: no errors
- `[3/4] Repository contract`: `REPO_CONTRACT: PASS`
- `[4/4] Security check`: `SECURITY_CHECK: PASS`
- Final line: `VERIFY_REPO: PASS`

## Assumptions
- `sort_by` matching is exact and case-sensitive. AC-07.4 says "any other value" is rejected and SPEC.md lists the lowercase values only. This differs from `category` and `genre`, which are case-insensitive by explicit requirement. So `RATING`, an empty `sort_by=` and a repeated `sort_by` return 400, consistent with the SPEC conventions for invalid or repeated parameters.
- When both `min_rating` and `sort_by` are invalid, `min_rating` is validated first and its error message is returned. Either way the response is 400 `{ error }`.
- `release_date` values follow the `YYYY-MM-DD` format, as `validateMovie` checks, so comparing them as strings gives chronological order.
- Movies with a missing or invalid sort value (non-numeric `vote_average` or empty `release_date`) go last, in catalog order. FR-07 does not define this case and the current fixture has no such movies.
- The error message is in Spanish, per the SPEC.md conventions: `El parámetro "sort_by" debe ser "rating" o "release_date"`.
- In TASKS.md, T-07 is marked "Done (pending review)" rather than "Done", because this change has not had independent review or human approval.

## Known Limitations
- Only descending order is supported. FR-07 does not ask for ascending order or a direction parameter.
- The frontend does not expose `sort_by`, because CR-02 excludes frontend changes.
- REQUIREMENTS.md still shows FR-07 as "(Planned)". It is a protected file, and changing its status needs human approval (as was done for FR-06).
- The new HTTP stability test (AC-07.3) relies on the current fixture having `vote_average` ties. It asserts that ties exist, so it would fail loudly rather than pass silently if the fixture changed.
- Nothing has been committed. The changes are left in the work tree for independent review.

## Self-Check
[x] Scope respected
[x] Existing tests not weakened
[x] No undocumented dependency/API introduced
[x] Ready for independent review

This report is NOT an approval.

## Fix Cycle

Input: `results/human-review-decisions.md` (review of commit `fbd165b`). This cycle covers only RF-01 (ACCEPTED) and RF-02 (MODIFIED). RF-03 and RF-04 were REJECTED, so they were not acted on. REQUIREMENTS.md, SPEC.md, the API contract and the frontend are unchanged. No existing test was modified or removed, and no dependency was added.

### RF-01 — SHOULD FIX (ACCEPTED): AC-07.1/07.2/07.6 tests could pass with a no-op sort
- Action taken: I added tests whose input is not already in the expected order, plus a `search` + `sort_by` case at unit and HTTP level. Each returns at least 2 movies in an order different from the input or catalog order. No production code changed for RF-01.
- Files and lines changed:
  - `backend/test/movieService.test.js` lines 239-279 (inside `describe('sortMovies()')`): new fixture `unsortedMovies` and the new tests below.
  - `backend/test/api.test.js` lines 216-229 (inside `describe('API: GET /api/movies?sort_by (FR-07)')`): one new test.
- Tests added:
  - Unit `AC-07.1 / AC-07.2 reordena una entrada que no está en el orden esperado`: a shuffled copy of `mockMovies` (ids `[4, 2, 1, 3]`) must give `[1, 2, 3, 4]` by rating and `[3, 2, 1, 4]` by date. `unsortedMovies` must give `[22, 23, 24, 21]` by rating and `[24, 23, 21, 22]` by date.
  - Unit `AC-07.6 search + sortBy ordena los resultados filtrados (orden distinto al de entrada)`: `search: 'saga'` returns `[21, 23, 24]`, which sorts to `[23, 24, 21]` by rating and `[24, 23, 21]` by date.
  - HTTP `AC-07.6 search + sort_by reorders several matches (order differs from catalog order)`: `GET /api/movies?search=regresa&sort_by=rating` matches catalog ids `[2, 7, 9]` and must return `[9, 7, 2]`. The test first asserts that there are at least 2 matches and that the expected order differs from catalog order, so it fails loudly rather than passing silently if the fixture changes.
- Evidence: with `sortMovies` temporarily forced to return its input unsorted (a local mutation, reverted afterwards), all three new tests fail, along with the existing sort tests.

### RF-02 — SHOULD FIX (MODIFIED): `sortMovies` accepted any non-empty string as a `release_date` key
- Action taken: only strings in `YYYY-MM-DD` format, the same pattern `validateMovie` uses, are now valid `release_date` sort keys. Any other value goes last, in its original order, as the existing doc comment already said. The API contract is unchanged.
- Files and lines changed: `backend/services/movieService.js`
  - Lines 99-103: new constant `RELEASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/`.
  - Lines 144 and 147: the `release_date` check in `isValidKey` now uses `RELEASE_DATE_PATTERN.test(v)` instead of `v.length > 0`, with a comment.
- Tests added: unit `RF-02 release_date sin formato YYYY-MM-DD queda al final en su orden original` in `backend/test/movieService.test.js`. It mixes valid dates with `'abc'`, `'01/03/2024'`, `'2024-3-1'`, the number `20240101` and `'2024-03-01T00:00:00Z'`. Expected order: `[35, 32, 31, 33, 34, 36, 37]`.
- Evidence: against the pre-fix `movieService.js` from `HEAD`, this test fails (37 pass, 1 fail). The cause is that `'abc'` sorted ahead of the real dates.

### Commands Executed
- `node --test test/movieService.test.js` (in `backend/`), run against the `HEAD` version of `movieService.js` to confirm the RF-02 test fails before the fix. The file was restored afterwards.
- `node --test` (in `backend/`), run with a temporary no-op `sortMovies` to confirm the RF-01 tests detect it. The file was restored afterwards.
- `./scripts/verify_repo.sh`

### Verification Result
`./scripts/verify_repo.sh` printed:
- `[1/4] Tests`: 74 tests, 74 pass, 0 fail. That is 70 tests before this cycle plus 4 new ones.
- `[2/4] Lint`: no errors
- `[3/4] Repository contract`: `REPO_CONTRACT: PASS`
- `[4/4] Security check`: `SECURITY_CHECK: PASS`
- Final line: `VERIFY_REPO: PASS`

### Fix Cycle Self-Check
[x] Only RF-01 and RF-02 addressed; RF-03 and RF-04 not acted on
[x] Requirements and specification not changed
[x] Existing tests not weakened, modified or removed
[x] Nothing committed; changes are left in the work tree for re-review

This Fix Cycle is NOT an approval. A human decision or re-review is still required.
