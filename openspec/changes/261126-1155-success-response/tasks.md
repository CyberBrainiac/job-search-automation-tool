# Tasks — 261126-1155 Success response body

## 1. Unit tests (step 4)

Use the data of the delta. Each `describe` is a requirement name, and each `it` is a scenario name.

- [x] `apps/back/src/common/interceptors/response.interceptor.spec.ts` (NEW) — call `intercept()` with a mock `ExecutionContext` (`getType()`, `switchToHttp().getResponse()`) and a `CallHandler` that returns `of(value)` or `throwError(() => error)` of RxJS. Read the result with `lastValueFrom()`. Requirements: "Success response body" (except "Text result"), "Results that keep their shape".
- [x] `apps/back/test/app.e2e-spec.ts` — change the test of `GET /` to `describe('Success response body')` and `it('Text result')`. The expected body is the JSON of the scenario.

Run the tests. They must fail for the expected reason: `ResponseInterceptor` does not exist, and `GET /` returns the text `Hello World!`.

Result (step 4): 2026-11-26. `pnpm --filter back test` fails as expected: `response.interceptor.spec.ts` stops with `Cannot find module './response.interceptor.js'`. The file has 6 tests, one for each scenario. `pnpm --filter back test:e2e` fails as expected: "Text result" gets the text `Hello World!`, not the JSON body.

## 2. Code (step 5)

- [x] `packages/shared/src/api-response.ts` — add `SuccessResponse<T>` and `ApiResponse<T>` (RI2).
- [x] `packages/shared/src/index.ts` — add the type exports of `SuccessResponse` and `ApiResponse` (RI2).
- [x] `apps/back/src/common/interceptors/response.interceptor.ts` (NEW) — `ResponseInterceptor` (RI3, RI4).
- [x] `apps/back/src/app.module.ts` — add `{ provide: APP_INTERCEPTOR, useClass: ResponseInterceptor }` to `providers` (RI1).
- [x] `openspec/project.md` §4 — add the registration row "Global response interceptor: `apps/back/src/app.module.ts` (`providers`, `APP_INTERCEPTOR`)" (RI1).
- [ ] At the archive (README §9): make `openspec/specs/api-response/spec.md`. Its purpose: the back app sends each successful response in one shape. The front app reads the data and the status in the same way for each route.

## 3. Checks

```bash
pnpm --filter back test
```

```bash
pnpm --filter back test:e2e
```

```bash
pnpm build
```

```bash
pnpm lint
```

Result (step 5): 2026-11-26. All commands pass: `pnpm --filter back test` (6 files, 58 tests), `pnpm --filter back test:e2e` (2 files, 2 tests), `pnpm build` (3 packages), `pnpm lint` (0 warnings, 0 errors).
