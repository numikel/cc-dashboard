# Hive Review — wspólny prompt template (referencyjny)

**Cel sesji**: Pre-publication review projektu CC_dashboard (lokalny dashboard Claude Code, Next.js 16 + React 19 + SQLite, v0.2.0). Kompleksowy multi-perspektywiczny audyt 10 specjalistów, każdy w swojej domenie. Output → plan poprawek przed publikacją.

## Severity scale (obowiązuje wszystkich)

| Severity | Znaczenie | Decyzja |
|----------|-----------|---------|
| **Critical** | Blocker — nie publikujemy bez fixu (security hole, broken keyboard nav, critical bug, privacy breach) | Fix before release |
| **Major** | Istotny problem jakościowy/funkcjonalny, znacząco wpływa na użytkownika lub mantenance | Fix this iteration |
| **Minor** | Drobny defekt lub niezgodność z best practices, nie blokujący | Backlog |
| **Suggestions** | Nice-to-have, refactor, kosmetyka | Skip lub later |

## Format znaleziska (jednolity)

```
- [SEVERITY] <relative/path/to/file>:<line> — <Problem description in 1 line>
  Fix: <1-2 sentences how to address it; no full code patches>
```

Przykład:
```
- [Critical] src/app/api/sessions/route.ts:42 — Brak walidacji query param `projectId`, podatność na injection w SQL via Drizzle raw filter.
  Fix: Użyj zod schema do parsowania query params zanim przekażesz do DB. Pattern jak w `src/lib/sync/indexer.ts`.
```

## Struktura raportu (max 100 linii TOTAL, twardy limit)

```markdown
# <Agent name> — Review Report

## Scope
- Files reviewed: <key paths>
- Time: <YYYY-MM-DD>
- Tools used: <Context7 queries, Glob/Grep>

## Stats
- Critical: N | Major: N | Minor: N | Suggestions: N

## Findings (sorted Critical → Suggestions)

### Critical
- [Critical] file:line — problem
  Fix: ...

### Major
- ...

### Minor
- ...

### Suggestions
- ...

## Summary (3-4 lines)
<High-level take: ogólny stan domeny, top concern, czy projekt jest publishable z perspektywy tej domeny>
```

**Jeśli przekraczasz 100 linii**: zachowaj wszystkie Critical i Major. Minor/Suggestions skróć do top-N i napisz `> Dalsze N znalezisk poniżej progu Major pominięte ze względu na limit 100 linii`.

## Reguły dla agentów

1. **Read-only**: używaj tylko Glob, Grep, Read. Jedyny dozwolony zapis to **Twój** plik raportu w `.ai/temp/reviews/<agent>.md`.
2. **Scope discipline**: czytaj tylko pliki w przekazanej liście "Files to review" + ich naturalne zależności (importy). NIE rozpraszaj się na cały repo.
3. **Concrete locations**: zawsze podawaj `file:line` — globalne komentarze typu "ogólnie kod jest spaghetti" nie liczą się jako findings.
4. **Cross-domain unicność**: jeśli problem ewidentnie należy do innej domeny (np. ui-designer widzi missing aria-label → to domena a11y-tester), oznacz go jako `Cross-ref: <other agent domain>` i pomiń jeśli niepewny — orchestrator zdedupluje.
5. **Context7 MCP** — dostępne narzędzia `mcp__plugin_context7_context7__resolve-library-id` i `mcp__plugin_context7_context7__query-docs`. **UŻYJ** gdy weryfikujesz aktualne best practices dla swojej biblioteki/frameworka. Nie polegaj wyłącznie na wiedzy z treningu.
6. **Defensive read**: pliki mogą być duże — najpierw `Read` z `limit:100` żeby zobaczyć strukturę, potem celowane fragmenty.
7. **No false positives na bazie domysłów**: jeśli nie jesteś pewny czy coś jest problemem, oznacz jako `Suggestions` z notą "verify".

## Output path

`D:\Programowanie\CC_dashboard\.ai\temp\reviews\<agent-slug>.md`

(slug bez "-tester"/"-developer" nie obowiązuje — pełna nazwa wg planu)

## Project facts (skrócone, kontekst dla wszystkich agentów)

- **Stack**: Next.js 16 App Router, React 19, TypeScript 6, Tailwind 4.2.4, Drizzle ORM + better-sqlite3 (WAL), SWR, Recharts, Vitest
- **Constraints (z `CLAUDE.md`)**:
  - Localhost-first, NO remote auth/access bez explicit request
  - NIE storeujemy prompt/response/full message content (privacy)
  - Claude Code data path = read-only, SQLite w `/data` lub `DATA_DIR`
  - Chrome extension ograniczone do localhost permissions
  - JSONL parser musi być defensive
- **Privacy guard**: `src/lib/privacy/assert-metadata-only.ts` z 11 forbidden keys
- **CI**: GitHub Actions `ci.yml` (lint + typecheck + test + build)
- **Wersja**: v0.2.0 → publikacja jako pierwsza public release
