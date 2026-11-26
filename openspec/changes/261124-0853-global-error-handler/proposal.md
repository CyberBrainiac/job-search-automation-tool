# 261124-0853 — Error model and error log in the back app

Status: Implemented
Type: Feature
Depends on: none
Decisions: EH1–EH11 (`design.md` §1)

## Description

The back app turns each thrown value into one `AppError`: an error code, an HTTP status, a message, details for the client and a retry flag. It writes one log line for each `AppError`.
Today the back app has no error codes. Each part of the code must find the status and the message of an error by itself. The error inside an `AggregateError` or a `SuppressedError` loses its code.

## What changes

- NEW values in `@repo/shared`: `HTTP_STATUS_MESSAGES`, `ErrorCodes`, `ERROR_TABLE`, `CODE_BY_STATUS` and `isErrorCode()` (EH1, EH2).
- NEW types in `@repo/shared`: `ErrorCode`, `ErrorDefinition`, `AppError`, `ErrorDetails`, `ErrorCause` and `ErrorSource` (EH4, EH6, EH7).
- NEW `CustomException(code, message?, { details, cause })`. Its status comes from `ERROR_TABLE` (EH3).
- NEW `toAppError()` converts each thrown value with a list of error handlers. It unwraps `AggregateError` and `SuppressedError`, and it never throws (EH4, EH5, EH8, EH9).
- NEW `logError()` writes one log line for each `AppError`. Outside development, a log line has no line breaks (EH10).
- NEW `isDevelopment()` tells if `NODE_ENV` is `development` (EH11).

## Impact

| Area             | Items                                                                                                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoints        | No change. No code calls `toAppError()` before change `261126-1154`.                                                                                                                                                                                                                                            |
| Files (shared)   | NEW `packages/shared/src/http-status-messages.ts`, NEW `packages/shared/src/error-codes.ts`, NEW `packages/shared/src/app-error.ts`, `packages/shared/src/index.ts`                                                                                                                                             |
| Files (back app) | NEW `apps/back/src/common/environment.ts`, NEW `apps/back/src/common/errors/custom.exception.ts`, NEW `apps/back/src/common/errors/error-handler.ts`, NEW `apps/back/src/common/errors/error-handlers.ts`, NEW `apps/back/src/common/errors/to-app-error.ts`, NEW `apps/back/src/common/errors/error-logger.ts` |
| Tests            | NEW `apps/back/src/common/errors/to-app-error.spec.ts`, NEW `apps/back/src/common/errors/error-logger.spec.ts`                                                                                                                                                                                                  |
| Docs             | `openspec/project.md` (§3, §6), `openspec/README.md` §10 (glossary)                                                                                                                                                                                                                                             |
| Database         | No change                                                                                                                                                                                                                                                                                                       |
| Front app        | No code change. The front app can import `ERROR_TABLE`, `HTTP_STATUS_MESSAGES` and `AppError` from `@repo/shared`.                                                                                                                                                                                              |

## Validation

- [x] 1. Requirements and scenarios — 13 ADDED requirements with 35 scenarios. Each requirement has one or more scenarios. Each scenario has WHEN and THEN (script check).
- [x] 2. Names exist — `packages/shared/src/index.ts` exists. All other files, `CustomException`, `toAppError`, `logError`, `isDevelopment`, `ERROR_TABLE` and the test files are marked NEW. The route `/example` and the job `fetch-vacancies` do not exist on purpose (shared data of the delta).
- [x] 3. No conflict — the other open changes `261126-1154` and `261126-1156` add other requirements to `error-handling`. `261126-1155` uses the capability `api-response`. `openspec/specs/` has no capability `error-handling`.
- [x] 4. Decisions — EH1–EH11 are each in one or more requirements or tasks.
- [x] 5. Tests — `to-app-error.spec.ts` checks the requirements of `toAppError()`, `error-logger.spec.ts` checks the 3 log requirements. No `(journey)` mark.
- [x] 6. Migration — none (no database).
- [x] 7. Writing rules — no banned word (script check). Sentences have 25 words or fewer, except lists of names. Active voice, present tense. 10 new glossary terms in `README.md` §10.
- [x] 8. Description — a feature explanation, then the limit of today. No history of the work.
- [x] 9. Change ID — `261124-0853` is the only folder with this ID. The 52 scenario names of `error-handling` in the changes `261124-0853`, `261126-1154` and `261126-1156` are unique (script check).
- [x] 10. Diagrams — this change has no diagram. The diagrams of `docs/error-handling.md` §1–§3 follow `diagrams.md` (rendered with Mermaid 11).
