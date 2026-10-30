# Independent Re-review Report

## Review Context
Change ID: CR-02
Branch / PR: ada09/cr-02 → main
Commit reviewed: 1c5b0ef ("fix: address ADA-09 review findings"). The previous review covered fbd165b.
Reviewer: Claude (Cowork) independent sub-agent
Model: claude-opus-5-5
Tools / permissions: Read-only on the repository. I used git log/diff/show, `./scripts/verify_repo.sh` and read-only `node -e` probes. For mutation checks I ran the test suite against modified copies of `backend/` placed in the scratchpad (`.../scratchpad/mut/`), not in the repository. The only file I wrote is `results/re-review-report.md`.

Inputs:
- `results/review-report.md`
- `results/human-review-decisions.md`
- `results/pr.diff`
- `results/fix-cycle.diff`: identical to `git diff fbd165b 1c5b0ef -- backend` (checked with `diff`, output `FIXDIFF_SAME`)
- `results/verification-report.md` § "Re-verification after Fix Cycle"
- REQUIREMENTS.md FR-07, ARCHITECTURE.md, the code and the tests

## Finding Status

| Finding | Human Decision | Re-review Status | Evidence |
|---|---|---|---|
| RF-01: no real ordering evidence for search + sort_by; some unit fixtures already sorted (SHOULD FIX) | ACCEPTED (SHOULD FIX) | RESOLVED | See the RF-01 notes below. |
| RF-02: any non-empty string treated as a valid `release_date` sort key | MODIFIED → SHOULD FIX | RESOLVED | See the RF-02 notes below. |

### RF-01: RESOLVED

**New unit tests** (`backend/test/movieService.test.js`):
- `unsortedMovies` is defined at lines 240-245.
- The test "AC-07.1 / AC-07.2 reordena una entrada que no está en el orden esperado" uses a shuffled `mockMovies` (`[4,2,1,3]` → rating `[1,2,3,4]`, date `[3,2,1,4]`) and `unsortedMovies` (rating `[22,23,24,21]`, date `[24,23,21,22]`). In both cases the input order differs from the expected output.
- The test "AC-07.6 search + sortBy ..." runs a search for `saga`, which returns `[21,23,24]`. Sorting gives rating `[23,24,21]` and date `[24,23,21]`, so the search returns 3 results in an order different from the input.

**New HTTP test** (`backend/test/api.test.js:216-228`):
- The search term `regresa` matches catalog movies `2:7.6, 7:8.4, 9:8.5` (3 movies, confirmed with a read-only probe). The expected order `[9,7,2]` differs from the catalog order.
- The test asserts its own preconditions: `searched.length >= 2` and `notDeepEqual(expected, catalog order)`. It cannot silently become trivial if the fixture changes.

**No-op mutation check:** with `sortMovies` changed to return an unsorted copy (scratch copy only), 12 tests fail. These include all three new RF-01 tests: unit #7, unit #8 and HTTP "AC-07.6 search + sort_by reorders several matches".

**Existing tests:** none was removed or weakened. `git diff fbd165b 1c5b0ef -- backend/test | grep '^-[^-]'` produces no output, so the fix only adds lines.

### RF-02: RESOLVED

**Code change** (`backend/services/movieService.js`):
- A new constant, `RELEASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/`, is defined at lines 99-102.
- The predicate is now `v => typeof v === 'string' && RELEASE_DATE_PATTERN.test(v)` (line 147).
- This is the same format rule that `validateMovie` enforces (line 273).

**New unit test:** "RF-02 release_date sin formato YYYY-MM-DD queda al final ..." expects `[35,32,31,33,34,36,37]`. The well-formed dates come first, newest first. The values `'abc'`, `'01/03/2024'`, `'2024-3-1'`, the number `20240101` and the ISO timestamp all go last, in their original order.

**Mutation check:** with the old predicate (`v.length > 0`) restored in a scratch copy, exactly 1 test fails, and it is the new RF-02 test (`# pass 73 / # fail 1`).

**No change to the API contract:** all 16 fixture dates match the pattern. A probe of `sortMovies(catalog,'release_date')` returns `11,5,16,4,10,3,2,12,1,6,7,15,8,9,13,14`, the same order observed at fbd165b.

### Rejected findings
RF-03 and RF-04 were REJECTED by the human reviewer (see `results/human-review-decisions.md`). They were not re-reviewed.

## New Findings / Regressions
None.

I checked for regressions as follows:
- **Protected paths and dependencies:** `git diff main 1c5b0ef -- REQUIREMENTS.md SPEC.md backend/data frontend backend/package.json` → 0 lines.
- **Scope of the code change:** the only production change in the fix cycle is the date predicate and its constant. `app.js` and the `parseSortBy` / `min_rating` logic were not touched.
- **Fix-cycle tests:** the 4 new tests only add assertions.

One non-blocking observation, not a finding: the pattern checks the date format, not whether the date exists on the calendar. For example, `'2024-13-45'` is still treated as a valid key. This matches both `validateMovie` and the human's required action ("only `YYYY-MM-DD` strings").

## Verification Evidence
I ran `./scripts/verify_repo.sh` myself at 1c5b0ef:
- `# tests 74`, `# pass 74`, `# fail 0`
- Lint passed, with no errors reported
- `REPO_CONTRACT: PASS`
- `SECURITY_CHECK: PASS`
- `VERIFY_REPO: PASS`

This agrees with `results/verification-report.md` § "Re-verification after Fix Cycle" (74/74 tests; the fix cycle added 4 tests).

Mutation checks were run on scratch copies of `backend/`, with the repository untouched:
- `sortMovies` as a no-op → 62 pass / 12 fail.
- The old date predicate restored → 73 pass / 1 fail (the RF-02 test).

## Re-review Recommendation
[ ] NOT READY
[x] READY FOR HUMAN MERGE DECISION

This recommendation is not a merge approval.
