# 261126-1155 — Success response body

Status: Implemented
Type: Feature
Depends on: 261126-1154 (`BaseResponse` in `packages/shared/src/api-response.ts`)
Decisions: RI1–RI5 (`design.md` §1)

## Description

The back app sends each successful response in one shape: `{ success: true, data, statusCode }`. The front app reads `success` to tell a success response from an error response.
Today a success body is the result of the handler as it is, for example the text `Hello World!`. It has no field in common with the error response.

## What changes

- NEW `ResponseInterceptor` wraps the result of each HTTP handler in the success response (RI1, RI3).
- `@repo/shared` gets `SuccessResponse<T>` and `ApiResponse<T>` (RI2).
- A `StreamableFile` and a value of a context that is not HTTP keep their shape (RI4).
- `GET /` returns `{ success: true, data: 'Hello World!', statusCode: 200 }`, not the text `Hello World!`.

## Impact

| Area             | Items                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| Endpoints        | Each route: the success body changes to the success response. `GET /` returns JSON, not text. No new endpoint.        |
| Files (shared)   | `packages/shared/src/api-response.ts`, `packages/shared/src/index.ts`                                                 |
| Files (back app) | NEW `apps/back/src/common/interceptors/response.interceptor.ts`, `apps/back/src/app.module.ts`                        |
| Tests            | NEW `apps/back/src/common/interceptors/response.interceptor.spec.ts`, `apps/back/test/app.e2e-spec.ts` (the new body) |
| Docs             | `openspec/project.md` §4, `openspec/README.md` §10 (glossary)                                                         |
| Database         | No change                                                                                                             |
| Front app        | No code change. The front app calls no endpoint yet. A later call reads `body.data`.                                  |

## Validation

- [x] 1. Requirements and scenarios — 2 ADDED requirements with 7 scenarios. Each requirement has one or more scenarios. Each scenario has WHEN and THEN (script check).
- [x] 2. Names exist — `apps/back/src/app.module.ts`, `apps/back/test/app.e2e-spec.ts`, `packages/shared/src/index.ts` and the route `GET /` exist. `api-response.ts` and `BaseResponse` come from change `261126-1154`. `ResponseInterceptor`, `SuccessResponse`, `ApiResponse` and the spec file are marked NEW.
- [x] 3. No conflict — no other change has the capability `api-response`. Change `261126-1154` makes the body of an exception, and this change does not change it.
- [x] 4. Decisions — RI1–RI5 are each in one or more requirements or tasks. RI5 is in `design.md` §2 and in the docs (§11).
- [x] 5. Tests — the unit test of the interceptor checks 6 scenarios. The e2e test checks "Text result". No `(journey)` mark.
- [x] 6. Migration — none (no database).
- [x] 7. Writing rules — no banned word (script check). Sentences have 25 words or fewer, except lists of names. Active voice, present tense. 1 new glossary term in `README.md` §10.
- [x] 8. Description — a feature explanation, then the limit of today. No history of the work.
- [x] 9. Change ID — `261126-1155` is the only folder with this ID. The 7 scenario names of `api-response` are unique (script check).
- [x] 10. Diagrams — this change has no diagram.
