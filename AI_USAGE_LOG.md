# AI Usage Log — ADA-09 Agentic Code Review

Herramienta: Claude (Cowork), modelo claude-opus-5-5. Coder y reviewer corren como sub-agentes en contextos separados; el coder nunca vio la conversación del reviewer ni al revés.

| # | Fecha | Fase | Qué hizo la IA | Decisión humana / validación |
|---|---|---|---|---|
| 1 | 2026-10-30 | Change Request | Propuso CR-02 (`sort_by`) a partir de FR-07, ya definido en REQUIREMENTS.md, con criterios de verificación observables. | Human Gate 0: aprobé el CR porque toca servicio, ruta y tests, y cada AC es verificable. |
| 2 | 2026-10-30 | Plan del coder | El coder-agent planeó `parseSortBy` + `sortMovies` (puros, en services) y el cableado en `app.js`, ordenando después de filtrar. | Acepté el plan: respeta ARCHITECTURE.md (reglas en services, HTTP solo mapea a 400). |
| 3 | 2026-10-30 | Implementación | Implementó y agregó 24 tests nombrados por AC; supuso que `sort_by` es sensible a mayúsculas y que `min_rating` inválido tiene precedencia. | Acepté ambos supuestos porque no contradicen SPEC.md; registré la precedencia como pregunta abierta. |
| 4 | 2026-10-30 | Verification Gate | `verify_repo.sh` PASS (70/70, lint, contract, security) antes de la revisión. | Confirmé que el gate pasó antes de llamar al reviewer, como pide el ADA. |
| 5 | 2026-10-30 | Reviewer-agent | En sesión independiente y read-only, encontró RF-01: tests de orden con fixture ya ordenado y un caso search+sort con 1 resultado (falsa confianza con tests verdes). | Verifiqué la evidencia en `movieService.test.js:194` (8.2, 7.6, 5.6, 4.2): era real. |
| 6 | 2026-10-30 | Human review | 4 findings: RF-01 ACCEPTED, RF-02 MODIFIED (OPTIONAL → SHOULD FIX), RF-03 y RF-04 REJECTED. | RF-04 lo rechacé porque el reviewer interpretó mal quién hizo el commit; RF-02 lo subí porque es un defecto en código nuevo del PR que contradice su propio comentario. |
| 7 | 2026-10-30 | Fix cycle | El coder, en nueva sesión, corrigió solo RF-01 y RF-02 (+4 tests, patrón YYYY-MM-DD) y comprobó que los tests nuevos fallan con un sort no-op. | Confirmé que no amplió el alcance: solo cambió 1 línea de producción más tests. |
| 8 | 2026-10-30 | Re-review | El reviewer marcó RF-01 y RF-02 como RESOLVED y no encontró nuevos MUST FIX; re-ejecutó verify (74/74). | Human Gate final: READY FOR HUMAN MERGE; acepté como deuda que la fecha solo se valida por formato. |
