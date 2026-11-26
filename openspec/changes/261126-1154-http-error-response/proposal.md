# 261126-1154 — HTTP error response

Status: Reviewed
Type: Feature
Depends on: 261124-0853 (`AppError`, `toAppError()`, `logError()`, `isDevelopment()`)
Decisions: EF1–EF10 (`design.md` §1)

## Description

The back app answers each request that ends with an exception with one JSON error response. The response has the status, a message for the customer, and an error code and details for the client. In development, it also has debug fields.
Today the back app sends the NestJS default body `{ statusCode, message, error }`. It has no error code, so the front app cannot tell a validation error from another `400`.

## What changes

- NEW `AllExceptionsFilter` catches each exception on each route. It converts the exception with `toAppError()`, logs it with the logger function and sends the error response (EF1, EF2, EF4).
- `@repo/shared` gets `BaseResponse`, `ErrorResponse`, `ErrorMetadata` and `ErrorDebug`. They replace `ApiErrorResponse` (EF3).
- Outside development, the error response has no debug fields. A response with a status of 500 or more has the default message of its code (EF5).
- After the response has started, the filter only logs the error. When the body is not complete, it closes the connection (EF6).
- The filter sends the reply also when the logger fails (EF7).
- The back `dev` script sets `NODE_ENV=development` (EF9).

## Impact

| Area             | Items                                                                                                                                                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoints        | Each route: the body of an error changes from the NestJS default body to the error response. No new endpoint.                                                                                                                           |
| Files (shared)   | NEW `packages/shared/src/api-response.ts`, `packages/shared/src/index.ts`. Deleted: `packages/shared/src/api-error.ts`                                                                                                                  |
| Files (back app) | NEW `apps/back/src/common/filters/all-exceptions.filter.ts`, NEW `apps/back/src/common/errors/error.tokens.ts`, NEW `apps/back/src/common/errors/to-error-response.ts`, `apps/back/src/app.module.ts`, `apps/back/package.json` (`dev`) |
| Files (root)     | `pnpm-workspace.yaml` (`shellEmulator`)                                                                                                                                                                                                 |
| Tests            | NEW `apps/back/src/common/filters/all-exceptions.filter.spec.ts`, NEW `apps/back/test/error-handling.e2e-spec.ts`                                                                                                                       |
| Docs             | `openspec/project.md` (§4, §8), `openspec/README.md` §10 (glossary), `docs/error-handling.md`                                                                                                                                           |
| Database         | No change                                                                                                                                                                                                                               |
| Front app        | No code change. The front app can import `ErrorResponse` from `@repo/shared`.                                                                                                                                                           |

## Validation

- [x] 1. Requirements and scenarios — 7 ADDED requirements with 14 scenarios. Each requirement has one or more scenarios. Each scenario has WHEN and THEN (script check).
- [x] 2. Names exist — `apps/back/src/app.module.ts`, `apps/back/package.json`, `pnpm-workspace.yaml`, `packages/shared/src/index.ts`, `packages/shared/src/api-error.ts` and `ApiErrorResponse` exist. `toAppError`, `logError`, `isDevelopment` and `backErrorHandlers` come from change `261124-0853`. The filter, the tokens, `toErrorResponse`, `api-response.ts` and the test files are marked NEW. The routes `/example` and `/no-such-route` do not exist on purpose (shared data of the delta).
- [x] 3. No conflict — `261124-0853` and `261126-1156` add other requirements to `error-handling`. `261126-1155` adds `SuccessResponse` to `api-response.ts` and does not change `ErrorResponse`.
- [x] 4. Decisions — EF1–EF10 are each in one or more requirements or tasks.
- [x] 5. Tests — the unit test of the filter checks 13 scenarios. The e2e test checks "Unknown route". No `(journey)` mark.
- [x] 6. Migration — none (no database).
- [x] 7. Writing rules — no banned word (script check). Sentences have 25 words or fewer, except lists of names. Active voice, present tense. 3 new glossary terms in `README.md` §10.
- [x] 8. Description — a feature explanation, then the limit of today. No history of the work.
- [x] 9. Change ID — `261126-1154` is the only folder with this ID. The 52 scenario names of `error-handling` in the changes `261124-0853`, `261126-1154` and `261126-1156` are unique (script check).
- [x] 10. Diagrams — this change has no diagram. The diagrams of `docs/error-handling.md` §4 and §4.1 follow `diagrams.md` (rendered with Mermaid 11).
