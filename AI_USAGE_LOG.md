# AI Usage Log — ADA-09 Agentic Code Review

Mínimo 6 entradas significativas. Cada entrada debe dejar claro qué hizo la IA y la decisión tomada.

Herramienta / modelo utilizado: Claude Opus 5.5 medium (`claude-opus-5-5`) en Claude Cowork. El coder-agent y el reviewer-agent corrieron como sub-agentes en contextos separados: el reviewer nunca vio la conversación del coder ni al revés (`results/run-context.md`).

---

## Entrada 1 — Definición o refinamiento del Change Request

**Fecha:** 30/10/26

**Herramienta / modelo:** Claude Opus 5.5 medium (Cowork, sesión principal / orquestador)

**Qué le pedí a la IA (prompt o intención):**
Redactar un Change Request pequeño y verificable a partir de FR-07 (ordenar listados), que ya estaba definido en `REQUIREMENTS.md` como *Planned*, siguiendo la plantilla del ADA y las reglas de `AGENTS.md`.

**Qué propuso / hizo la IA:**
Propuso CR-02: parámetro opcional `sort_by=rating|release_date` en `GET /api/movies`, aplicado después de filtrar. Listó FR-07 y AC-07.1 … AC-07.6, restricciones de arquitectura (validación y orden en `backend/services/`, mapeo HTTP en `app.js`), prohibiciones explícitas (no tocar `min_rating`/FR-06 ni el frontend, no debilitar tests) y criterios de verificación observables (`sort_by=title` → 400, sin `sort_by` → orden de catálogo, `VERIFY_REPO: PASS`).

**Mi decisión (aceptado / rechazado / modificado) y por qué:**
Aceptado (Human Gate 0). El cambio toca servicio, ruta y tests, cada AC se puede comprobar con un request concreto y el alcance quedó acotado para que el coder no "mejorara" FR-06 ni la UI.

**Evidencia (archivo, commit, comando o resultado):**
`CHANGE_REQUEST.md` (Approved to implement: YES, Ruben Perez, 2026-10-30); commit `1085cfa` "docs: add approved CHANGE_REQUEST CR-02"; rama `ada09/cr-02` creada desde ese commit (`results/run-context.md`).

---

## Entrada 2 — Plan del coder-agent y decisión humana sobre el plan

**Fecha:** 30/10/26

**Herramienta / modelo:** Claude Opus 5.5 medium — coder-agent (sub-agente, contexto nuevo, escritura en el work tree, sin permiso de commit)

**Qué le pedí a la IA (prompt o intención):**
Leer `AGENTS.md`, el CR, `REQUIREMENTS.md`, `SPEC.md`, `ARCHITECTURE.md`, `TASKS.md`, el código y los tests, y escribir un plan de implementación **antes** de tocar código.

**Qué propuso / hizo la IA:**
Plan en 4 pasos: (1) `parseSortBy(raw)` en `movieService.js` que devuelve `{ valid, value, error }` igual que `parseMinRating`, y `sortMovies(movies, sortBy)` puro, estable, descendente y que siempre devuelve un arreglo nuevo (NFR-02); (2) en `app.js` solo validar, mapear inválido a `400 { error }` y llamar `sortMovies(filterMovies(...))` para ordenar después de filtrar (AC-07.6); (3) tests unitarios y HTTP nombrados por AC; (4) actualizar T-07 en `TASKS.md` y correr `verify_repo.sh`.

**Mi decisión (aceptado / rechazado / modificado) y por qué:**
Aceptado. Respeta la regla de ubicación de reglas de negocio de `ARCHITECTURE.md` (services puros, `app.js` solo mapea HTTP), reutiliza el patrón ya existente de `parseMinRating` en lugar de inventar uno nuevo y no agrega dependencias. También acepté que marcara T-07 como "Done (pending review)" y no "Done", porque aún no había revisión independiente.

**Evidencia (archivo, commit, comando o resultado):**
`results/coder-report.md` § "Implementation Plan"; `TASKS.md` fila T-07.

---

## Entrada 3 — Implementación: sugerencia relevante aceptada/rechazada

**Fecha:** 30/10/26

**Herramienta / modelo:** Claude Opus 5.5 medium — coder-agent

**Qué le pedí a la IA (prompt o intención):**
Implementar el plan aprobado, agregar tests por AC y documentar cualquier supuesto que no estuviera definido en SPEC.

**Qué propuso / hizo la IA:**
Implementó `SORT_FIELDS`, `parseSortBy` y `sortMovies` y agregó 24 tests (46 → 70). Tomó varios supuestos y los dejó escritos en "Assumptions": `sort_by` es exacto y sensible a mayúsculas (`RATING` → 400), `sort_by=` vacío y parámetro repetido → 400, rechaza claves heredadas como `__proto__`/`toString`, y si `min_rating` y `sort_by` son ambos inválidos gana el mensaje de `min_rating`. También dejó películas sin valor de orden válido al final.

**Mi decisión (aceptado / rechazado / modificado) y por qué:**
Aceptado. El supuesto de mayúsculas es coherente con AC-07.4 ("any other value") y con SPEC, que solo lista los valores en minúsculas (a diferencia de `category`/`genre`, que son case-insensitive por requisito explícito). La precedencia de errores no viola nada (ambos casos dan 400), así que no la cambié, pero la registré como pregunta abierta en lugar de asumir que estaba resuelta.

**Evidencia (archivo, commit, comando o resultado):**
Commit `fbd165b` "feat: implement CR-02"; `results/coder-report.md` § "Assumptions"; `./scripts/verify_repo.sh` → 70/70, lint 0 problemas, `REPO_CONTRACT: PASS`, `SECURITY_CHECK: PASS`, `VERIFY_REPO: PASS` (`results/verification-report.md`).

---

## Entrada 4 — Reviewer-agent: finding relevante y evidencia

**Fecha:** 30/10/26

**Herramienta / modelo:** Claude Opus 5.5 medium — reviewer-agent (sub-agente independiente, read-only, sin acceso a la conversación del coder)

**Qué le pedí a la IA (prompt o intención):**
Construir un review contract a partir de REQUIREMENTS/SPEC/ARCHITECTURE/AGENTS y revisar el commit `fbd165b` contra él: cobertura de AC, APIs inexistentes, fronteras de arquitectura, tests que den falsa confianza, regresiones y deuda técnica, citando evidencia en cada finding.

**Qué propuso / hizo la IA:**
Re-ejecutó `verify_repo.sh`, hizo probes de comportamiento con la app en memoria y reportó 0 MUST FIX, 1 SHOULD FIX y 3 OPTIONAL. El más relevante fue **RF-01**: el fixture unitario `mockMovies` ya estaba ordenado por `vote_average` (8.2, 7.6, 5.6, 4.2), así que `sortMovies(mockMovies, 'rating')` pasaba aunque el sort fuera un no-op; además el caso HTTP `search + sort_by` usaba el título de la primera película y devolvía 1 solo resultado, y el caso unitario de search devolvía `[]`. AC-07.6 no tenía evidencia real para `search`.

**Mi decisión (aceptado / rechazado / modificado) y por qué:**
Aceptado como SHOULD FIX dentro de este PR. Lo verifiqué yo mismo en `backend/test/movieService.test.js:194` y en `backend/test/api.test.js:209-213`: era cierto. Los tests estaban verdes pero no podían distinguir un sort correcto de uno que no hace nada.

**Evidencia (archivo, commit, comando o resultado):**
`results/review-contract.md`; `results/review-report.md` § RF-01; commit `1a5ff7e` (contract, review y decisiones humanas).

---

## Entrada 5 — Human review: finding aceptado, modificado o rechazado y por qué

**Fecha:** 30/10/26

**Herramienta / modelo:** Claude Opus 5.5 medium (sesión principal, me ayudó a contrastar cada finding con el código y el historial de git); la decisión fue mía.

**Qué le pedí a la IA (prompt o intención):**
Para cada finding del reviewer, mostrarme la línea citada y la evidencia en git para decidir ACCEPTED / MODIFIED / REJECTED con razón.

**Qué propuso / hizo la IA:**
Confirmó que RF-02 era un defecto real en código nuevo: el predicado de fecha válida era `v.length > 0`, así que `"not-a-date"` quedaba antes que fechas reales, contradiciendo el propio JSDoc ("sin valor válido quedan al final") y el formato que exige `validateMovie`. Para RF-04 mostró la secuencia `run-context.md` → `commits.txt`: el coder no tenía permiso de commit y el commit `fbd165b` lo hice yo después.

**Mi decisión (aceptado / rechazado / modificado) y por qué:**
- RF-01: **ACCEPTED** (SHOULD FIX).
- RF-02: **MODIFIED**, de OPTIONAL a SHOULD FIX: el reviewer lo vio como robustez fuera del fixture, pero es código introducido por este PR que no cumple su propio contrato y el arreglo es pequeño y está en alcance.
- RF-03: **REJECTED**: el riesgo de que el oráculo comparta lógica con la implementación ya estaba cubierto por asserts con órdenes de ids fijos en los tests unitarios (AC-07.3) y por la comprobación de monotonía en `api.test.js`.
- RF-04: **REJECTED**: la frase "Nothing has been committed" era verdadera cuando se escribió; el reviewer interpretó mal la secuencia de eventos. No es un defecto del cambio.
Human Gate: regresar al coder-agent.

**Evidencia (archivo, commit, comando o resultado):**
`results/human-review-decisions.md`; `results/commits.txt`; `results/run-context.md`.

---

## Entrada 6 — Fix/re-review: qué cambió después de la revisión

**Fecha:** 30/10/26

**Herramienta / modelo:** Claude Opus 5.5 medium — coder-agent (nueva sesión) para el fix y reviewer-agent independiente para el re-review

**Qué le pedí a la IA (prompt o intención):**
Al coder: corregir **solo** RF-01 y RF-02 según `human-review-decisions.md`, sin tocar requisitos, SPEC, contrato de API ni tests existentes. Al reviewer: verificar si cada finding aceptado quedó resuelto y buscar regresiones.

**Qué propuso / hizo la IA:**
El coder agregó 4 tests (entradas desordenadas `unsortedMovies`, `search: 'saga'` con 3 resultados, HTTP `search=regresa&sort_by=rating` → `[9, 7, 2]` con precondiciones que fallan si el fixture cambia, y el caso RF-02 con fechas inválidas) y cambió una sola regla de producción: `RELEASE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/`. Demostró que los tests nuevos fallan contra el código anterior. El reviewer hizo mutation checks en copias del backend: `sortMovies` como no-op → 62 pass / 12 fail; predicado viejo → 73 pass / 1 fail. Marcó RF-01 y RF-02 como RESOLVED, sin nuevos findings.

**Mi decisión (aceptado / rechazado / modificado) y por qué:**
Aceptado. Revisé que el fix no ampliara alcance (`git diff fbd165b 1c5b0ef -- backend/test | grep '^-[^-]'` sin salida: solo agrega). Acepté como deuda conocida que el patrón valida formato y no fechas imposibles (`2024-13-45`), igual que `validateMovie`. Gate final: READY FOR HUMAN MERGE; hice el merge y después marqué FR-07 como *Implemented* en `REQUIREMENTS.md` (archivo protegido, acción humana).

**Evidencia (archivo, commit, comando o resultado):**
Commit `1c5b0ef` "fix: address ADA-09 review findings"; `results/fix-cycle.diff`; `results/re-review-report.md`; `verify_repo.sh` → 74/74, `VERIFY_REPO: PASS`; `results/PR_EVIDENCE.md`; merge `3269499`; `5ac02f4` "docs(requirements): mark FR-07 implemented (human-approved)".

---
