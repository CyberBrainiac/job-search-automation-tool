# 261124-0853 — Global error handler in the back app

Status: Draft
Type: Feature
Depends on: none
Decisions: EH1–EH8 (`design.md` §1)

## Description

The back app answers each request that ends with an exception with one JSON error response. The error response has the HTTP status, a message and an error code that the front app can check.
Today the back app sends the NestJS default body `{ statusCode, message, error }`. This body has no error code, so the front app can read only the status and the text of the message.

## What changes

- NEW `AllExceptionsFilter` catches each exception on each route and sends the error response (EH1, EH2).
- NEW `CustomException` lets a service throw a business error with an HTTP status and an error code (EH5).
- An unexpected error gives `500 Internal Server Error` with a fixed message. The log line keeps the real message and the stack (EH6).
- The error response has a stack trace only when `NODE_ENV` is `development` (EH7).
- `@repo/shared` gets `BaseResponse`, `ErrorResponse`, `ErrorMetadata`, `ErrorCodes` and `ErrorCode`. They replace `ApiErrorResponse` (EH3, EH4).
- `openspec/project.md` gets the rules to throw an error and to convert the error of an external call (EH8).

## Impact

| Area             | Items                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoints        | Each route: the body of an error changes from the NestJS default body to the error response. No new endpoint.                                                    |
| Files (back app) | NEW `apps/back/src/common/filters/all-exceptions.filter.ts`, NEW `apps/back/src/common/exceptions/custom.exception.ts`, `apps/back/src/app.module.ts`            |
| Files (shared)   | NEW `packages/shared/src/api-response.ts`, NEW `packages/shared/src/error-codes.ts`, `packages/shared/src/index.ts`. Deleted: `packages/shared/src/api-error.ts` |
| Tests            | NEW `apps/back/src/common/filters/all-exceptions.filter.spec.ts`, NEW `apps/back/test/error-handling.e2e-spec.ts`                                                |
| Docs             | `openspec/project.md`, `docs/error-handling.md` (diagrams)                                                                                                       |
| Database         | No change                                                                                                                                                        |
| Front app        | No code change. The front app can import the new types from `@repo/shared`.                                                                                      |

## Validation

- [x] 1. Requirements and scenarios — 7 ADDED requirements with 12 scenarios. Each scenario has WHEN and THEN (script check).
- [x] 2. Names exist — `apps/back/src/app.module.ts`, `packages/shared/src/index.ts` and `ApiErrorResponse` exist. `AllExceptionsFilter`, `CustomException`, `ErrorCodes`, the shared files and the test files are marked NEW. The routes `/example` and `/no-such-route` do not exist on purpose (shared data of the delta).
- [x] 3. No conflict — no other open change. `openspec/specs/` has no capability `error-handling`.
- [x] 4. Decisions — EH1–EH8 are each in one or more tasks. EH6 and EH7 are also in requirements (script check).
- [x] 5. Tests — a unit test of the filter checks 11 scenarios. The e2e test checks "Unknown route". No `(journey)` mark.
- [x] 6. Migration — none (no database).
- [x] 7. Writing rules — no banned word (script check), short sentences, active voice. 5 new glossary terms in `README.md` §10.
- [x] 8. Description — a feature explanation, then the limit of today.
- [x] 9. Change ID — `261124-0853` is the only folder with this ID. The 12 scenario names are unique (script check).
