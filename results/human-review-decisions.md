# Human Review Decisions

## Change
CR-02 — commit reviewed `847bcdf` (branch `ada09/cr-02`)
Reviewer: Ruben Perez — 2026-10-30
Input: `results/review-report.md` (0 MUST FIX, 1 SHOULD FIX, 3 OPTIONAL)

### RF-01
Reviewer severity: SHOULD FIX
Human decision: ACCEPTED
Reason: Confirmed in `backend/test/movieService.test.js:194` that the unit fixture is already ordered by rating (8.2, 7.6, 5.6, 4.2), so `sortMovies(mockMovies, 'rating')` would pass even if sorting were a no-op; the HTTP `search + sort_by` case in `backend/test/api.test.js:209-213` returns a single movie, so it proves nothing about ordering. AC-07.6 ("combines with all filters") lacks real evidence for `search`.
Final severity: SHOULD FIX (fix in this PR)
Required action: Add tests where the input is NOT already in the expected order, and a `search + sort_by` case (unit and HTTP) that returns at least 2 movies in a different order than the catalog. Do not remove existing tests.

### RF-02
Reviewer severity: OPTIONAL
Human decision: MODIFIED
Reason: Real defect in code introduced by this PR: `sortMovies` treats any non-empty string as a valid `release_date` (`backend/services/movieService.js:139-141`), contradicting its own doc comment ("invalid values go last") and the date format required by `validateMovie`. No impact on today's catalog, but the fix is small and in scope.
Final severity: SHOULD FIX
Required action: Treat only `YYYY-MM-DD` strings as valid `release_date` sort keys (others go last, in original order). Add a unit test with an invalid date. No change to the API contract.

### RF-03
Reviewer severity: OPTIONAL
Human decision: REJECTED
Reason: The risk of a shared comparator is already mitigated: unit tests assert hard-coded id orders for ratings and dates including ties (`movieService.test.js` AC-07.3), and `api.test.js` checks descending order independently. Rewriting the helper adds no new evidence.

### RF-04
Reviewer severity: OPTIONAL
Human decision: REJECTED
Reason: The statement was true when written: the coder agent was not allowed to commit; the human created commit `847bcdf` afterwards (ADA step 11, see `results/run-context.md` and `results/commits.txt`). The reviewer misread the sequence of events; not a defect of the change.

### Open questions from the reviewer
- Error precedence when `min_rating` and `sort_by` are both invalid: both return 400; SPEC does not define precedence → no action (no requirement violated).
- FR-07 status in REQUIREMENTS.md: protected file, will be updated by the human after the final gate.

## Human Gate
[x] Return to coder-agent
[ ] Ready for final re-review
[ ] Stop / escalate
