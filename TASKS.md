# Tasks

| Task | Requirement | Status | Code | Tests |
|---|---|---|---|---|
| T-01 List/filter movies | FR-01 | Done | `services/movieService.js#filterMovies`, `app.js` | movieService.test.js, api.test.js |
| T-02 Movie detail | FR-02 | Done | `app.js` | api.test.js |
| T-03 Categories/genres | FR-03 | Done | `app.js` | api.test.js |
| T-04 Metrics | FR-04 | Done | `services/movieService.js#calculateCatalogMetrics` | movieService.test.js, api.test.js |
| T-05 Score presentation | FR-05 | Done | `services/movieService.js#formatMovieScore` | movieService.test.js |
| T-06 Minimum rating filter (CR-01) | FR-06 | Done | `services/movieService.js#parseMinRating`, `services/movieService.js#filterMovies`, `app.js` | movieService.test.js, api.test.js |
| T-07 Sort listings (CR-02) | FR-07 | Done (pending review) | `services/movieService.js#parseSortBy`, `services/movieService.js#sortMovies`, `app.js` | movieService.test.js, api.test.js |

Update the Status/Code/Tests columns when a task is completed (see AGENTS.md Definition of Done).
