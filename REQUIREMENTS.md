# Requirements — TMDB Clone (Movies)

Product: simplified clone of The Movie Database catalog. Express REST API (`backend/`) + vanilla JS frontend (`frontend/`).
Data source: static catalog in `backend/data/movies.json` (no external API calls).

Status legend: **Implemented** = present in code; **Planned** = approved, not implemented yet.

## Functional Requirements

### FR-01 — List and filter movies (Implemented)
`GET /api/movies` returns `{ total_results, results }`.
- AC-01.1: Without query params, all movies in the catalog are returned.
- AC-01.2: `category` filters by one of `trending`, `popular`, `top_rated`, `upcoming` (case-insensitive).
- AC-01.3: `genre` filters by exact genre name (case-insensitive); `all` disables the filter.
- AC-01.4: `search` matches a partial, case-insensitive substring of `title`, `original_title` or `overview`.
- AC-01.5: Filters can be combined (logical AND).

### FR-02 — Movie detail (Implemented)
- AC-02.1: `GET /api/movies/:id` returns the full movie object.
- AC-02.2: Unknown id returns HTTP 404 with `{ error }`.

### FR-03 — Catalog metadata (Implemented)
- AC-03.1: `GET /api/categories` returns the list of available categories.
- AC-03.2: `GET /api/genres` returns unique genres sorted alphabetically.

### FR-04 — Catalog metrics (Implemented)
- AC-04.1: `GET /api/metrics` returns `total`, `averageScore` (1 decimal), `topRated`, `genresCount`, `genreDistribution`.
- AC-04.2: An empty catalog returns zeroed metrics and `topRated: null`.

### FR-05 — Score presentation (Implemented)
- AC-05.1: A 0–10 `vote_average` is shown as a 0–100 percentage.
- AC-05.2: Level is `high` (>= 70), `medium` (>= 50) or `low` (< 50).
- AC-05.3: Null, negative or > 10 values are normalized (0 or clamped to 100).

### FR-06 — Filter by minimum rating (Implemented)
`GET /api/movies` accepts an optional `min_rating` query parameter.
- AC-06.1: `min_rating=N` returns only movies with `vote_average >= N`.
- AC-06.2: `min_rating` combines with `category`, `genre` and `search` (logical AND).
- AC-06.3: A `min_rating` that is not a number, or is outside 0–10, returns HTTP 400 with `{ error }` and no results.
- AC-06.4: When `min_rating` is absent, the behavior of FR-01 is unchanged.

### FR-07 — Sort movie listings (Implemented)
`GET /api/movies` accepts an optional `sort_by` query parameter.
- AC-07.1: `sort_by=rating` returns results ordered by `vote_average` descending.
- AC-07.2: `sort_by=release_date` returns results ordered by `release_date` descending (newest first).
- AC-07.3: Ties keep the original catalog order (stable sort).
- AC-07.4: Any other `sort_by` value returns HTTP 400 with `{ error }`.
- AC-07.5: When `sort_by` is absent, the original catalog order is preserved (FR-01 unchanged).
- AC-07.6: `sort_by` combines with all FR-01 / FR-06 filters; sorting is applied after filtering.

## Non-Functional Requirements
- NFR-01: Business rules live in `backend/services/` as pure functions with unit tests.
- NFR-02: The API must not mutate the in-memory catalog loaded from `movies.json`.
- NFR-03: Existing endpoints must remain backward compatible.
