# Reflexión individual — ADA-09 Agentic Code Review

Nombre: Ruben Perez
Fecha: 30/10/2026

---

## 1. ¿Qué encontró el reviewer-agent que el coder-agent no detectó?

Que varios tests del propio coder no probaban lo que decían probar (RF-01). El fixture `mockMovies` ya venía ordenado por `vote_average` (8.2, 7.6, 5.6, 4.2), así que el test de AC-07.1 pasaba aunque `sortMovies` no hiciera nada, y el caso `search + sort_by` devolvía una sola película (HTTP) o ninguna (unitario). El coder reportó "70/70" y en su self-check marcó todo en orden; no podía verlo porque escribió el código y los tests con el mismo modelo mental. También encontró RF-02: el predicado de fecha válida (`v.length > 0`) contradecía el JSDoc que el mismo coder escribió, y lo demostró con un probe (`"not-a-date"` quedaba primero).

## 2. ¿Qué finding fue más difícil de clasificar y por qué?

RF-02. El reviewer lo marcó OPTIONAL porque con el catálogo actual (16 fechas bien formadas, `movies.json` protegido) no tiene impacto. Pero no es una mejora "fuera del umbral": es código nuevo de este PR que no cumple su propio contrato documentado ni la regla de formato de `validateMovie`. Tuve que decidir entre "no afecta hoy" y "está mal desde hoy". Lo subí a SHOULD FIX porque el arreglo era de una línea, estaba en alcance y no cambiaba el contrato de la API; si hubiera requerido cambiar SPEC o el catálogo lo habría diferido.

## 3. ¿Qué finding rechazaste o modificaste como humano y qué evidencia usaste?

- **RF-04 (rechazado):** el reviewer dijo que el coder-report era falso porque afirmaba "Nothing has been committed" y el código estaba en `fbd165b`. Usé `results/run-context.md` (el coder no tenía permiso de commit) y `results/commits.txt`: el commit lo hice yo después. La frase era cierta cuando se escribió; el reviewer leyó mal la secuencia.
- **RF-03 (rechazado):** el riesgo de un oráculo que comparte lógica con la implementación ya estaba mitigado por asserts con órdenes de ids fijos en `movieService.test.js` (AC-07.3) y por la comprobación de monotonía en `api.test.js`. Reescribir el helper no agregaba evidencia nueva.
- **RF-02 (modificado):** OPTIONAL → SHOULD FIX, con la evidencia de `movieService.js:139-141` frente al JSDoc de la línea 125 y la regex de `validateMovie`.

## 4. ¿Hubo algún test verde que produjera falsa confianza? Explica.

Sí, ese fue justo RF-01. `sortMovies(mockMovies, 'rating')` → `[1,2,3,4]` pasaba con un sort no-op porque la entrada ya estaba en ese orden, y el caso de `search` con 1 resultado se satisface con cualquier orden. La suite completa estaba verde y `verify_repo.sh` daba PASS. Lo que lo destapó fue preguntar "¿este test fallaría si quito la implementación?". Después del fix, el reviewer lo comprobó con mutación: con `sortMovies` como no-op fallan 12 tests, incluidos los 3 nuevos; con el predicado viejo de fecha falla exactamente el test de RF-02. Aprendí que el número de tests no es evidencia; un test vale si puede fallar.

## 5. ¿Verificaste alguna API o dependencia que parecía plausible? ¿Qué encontraste?

Sí. El reviewer confirmó que `parseSortBy` y `sortMovies` existen en `movieService.js`, están exportadas e importadas en `app.js`, y que `git diff main..HEAD -- backend/package.json` no tenía cambios: no hubo dependencias nuevas ni APIs inventadas. El punto delicado fue la estabilidad del orden: el coder confía en que `Array.prototype.sort` es estable, lo cual está garantizado desde ES2019 y en Node 22; el reviewer no lo dio por hecho y lo probó con un arreglo de 2000 elementos con muchos empates. También probó `sort_by=__proto__` y `hasOwnProperty`, porque una búsqueda en un objeto (`SORT_FIELDS[raw]`) podía aceptar claves heredadas; el código las rechaza.

## 6. ¿Qué arquitectura o regla del repositorio fue más útil para la revisión?

La regla de "Business-Rule Location" de `ARCHITECTURE.md`: validación y reglas en `backend/services/` como funciones puras que devuelven `{ valid, value, error }`, y `app.js` solo mapea a HTTP. Le dio al coder un patrón concreto que copiar (`parseMinRating`) y al reviewer un criterio objetivo para revisar `app.js:42-53`. Junto con eso, que los tests se nombren por AC hizo la trazabilidad casi mecánica: la tabla de `PR_EVIDENCE.md` sale directo de los nombres de los tests.

## 7. ¿Qué problema pudo detectar un check determinista antes que el reviewer-agent?

Los de frontera y alcance: `check_repo_contract.js` ya valida que los services no importen `express`/`http`/`fs` y que no se toquen rutas protegidas (`REQUIREMENTS.md`, `movies.json`, `.github/workflows/`), y `check_secrets.js` cubre credenciales. Eso pasó antes de llamar al reviewer, así que él no gastó esfuerzo ahí. Lo que RF-01 mostró es que la falsa confianza también se puede automatizar: un mutation test simple (reemplazar `sortMovies` por la identidad y exigir que fallen tests) habría detectado RF-01 sin LLM. Es candidato a agregarse al gate.

## 8. ¿Qué parte del review sigue requiriendo criterio humano?

- Decidir la severidad final: RF-02 dependía de qué tan "en alcance" está arreglar algo que hoy no afecta.
- Separar defectos del cambio de errores de contexto del reviewer (RF-04): el agente no sabía quién hizo el commit.
- Decidir qué no hacer (RF-03) para no alargar el PR sin agregar evidencia.
- Las preguntas abiertas que SPEC no define (precedencia de errores `min_rating`/`sort_by`) y aceptar deuda técnica.
- Tocar archivos protegidos (marcar FR-07 como *Implemented*) y aprobar el merge.

## 9. ¿Qué technical debt aceptaste o diferiste y por qué?

- `RELEASE_DATE_PATTERN` valida formato, no calendario (`2024-13-45` se acepta). Es consistente con `validateMovie` y el catálogo está protegido; arreglarlo bien implicaría cambiar también la validación del catálogo, fuera de CR-02.
- La precedencia cuando `min_rating` y `sort_by` son inválidos no está en SPEC; ambos dan 400 y no viola ningún requisito. Queda para documentarse en SPEC en un cambio futuro.
- Solo orden descendente y sin exponer `sort_by` en el frontend: FR-07 no pide más y el CR excluía el frontend.
- AC-07.3 para `release_date` solo se prueba a nivel unitario porque el fixture no tiene fechas empatadas y no se puede editar.

## 10. ¿Qué artefactos de este ADA reutilizarías en la Agentic Software Factory final?

- `CHANGE_REQUEST.md` con Human Gate 0 como entrada obligatoria de cada cambio.
- `results/review-contract.md` como plantilla: el reviewer revisa contra un contrato derivado de los requisitos, no contra "lo que le parezca".
- La separación coder / reviewer en contextos independientes, con el reviewer en modo read-only.
- `human-review-decisions.md` con ACCEPTED / MODIFIED / REJECTED y razón, más el fix cycle limitado a findings aceptados.
- `verify_repo.sh` como gate compartido por humano, agente y CI, ampliado con un mutation check básico.
- `PR_EVIDENCE.md` con la tabla de trazabilidad requisito → código → test → finding.
