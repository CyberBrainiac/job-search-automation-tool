# 261126-1156 — Errors outside requests

Status: Tested
Type: Feature
Depends on: 261124-0853 (`toAppError()`, `logError()`)
Decisions: EO1–EO4 (`design.md` §1)

## Description

The back app writes a log line for each error that happens outside a request: a promise rejection that no code catches, an exception that no code catches, and an error at startup. The line has the same shape as the log line of a request error.
Today Node writes its own text for these errors, and a promise rejection that no code catches stops the back app.

## What changes

- NEW `registerProcessErrorHandlers()` logs a promise rejection that no code catches, and the back app keeps running (EO1, EO2).
- It also logs an exception that no code catches, then stops the back app with the exit code 1 (EO1, EO3).
- NEW `handleStartupError()` logs an error of `bootstrap()`, then stops the back app with the exit code 1 (EO1, EO3).
- `main.ts` calls both functions (EO1).
- `openspec/project.md` §6 gets the rule for a promise with no `await` (EO4).

## Impact

| Area             | Items                                                                                |
| ---------------- | ------------------------------------------------------------------------------------ |
| Endpoints        | No change                                                                            |
| Files (back app) | NEW `apps/back/src/common/errors/process-error-handlers.ts`, `apps/back/src/main.ts` |
| Tests            | NEW `apps/back/src/common/errors/process-error-handlers.spec.ts`                     |
| Docs             | `openspec/project.md` §6                                                             |
| Database         | No change                                                                            |
| Front app        | No change                                                                            |

## Validation

- [x] 1. Requirements and scenarios — 3 ADDED requirements with 3 scenarios. Each requirement has one or more scenarios. Each scenario has WHEN and THEN (script check).
- [x] 2. Names exist — `apps/back/src/main.ts` and `bootstrap()` exist. `toAppError` and `logError` come from change `261124-0853`. `process-error-handlers.ts`, its two functions and the spec file are marked NEW.
- [x] 3. No conflict — `261124-0853` and `261126-1154` add other requirements to `error-handling`.
- [x] 4. Decisions — EO1–EO4 are each in one or more requirements or tasks.
- [x] 5. Tests — the unit test checks the 3 scenarios with an `EventEmitter` and spies. No `(journey)` mark.
- [x] 6. Migration — none (no database).
- [x] 7. Writing rules — no banned word (script check). Sentences have 25 words or fewer, except lists of names. Active voice, present tense. no new glossary term.
- [x] 8. Description — a feature explanation, then the limit of today. No history of the work.
- [x] 9. Change ID — `261126-1156` is the only folder with this ID. The 52 scenario names of `error-handling` in the changes `261124-0853`, `261126-1154` and `261126-1156` are unique (script check).
- [x] 10. Diagrams — this change has no diagram. The diagram of `docs/error-handling.md` §7 follows `diagrams.md` (rendered with Mermaid 11).
