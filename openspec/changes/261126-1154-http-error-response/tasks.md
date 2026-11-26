# Tasks — 261126-1154 HTTP error response

## 1. Unit tests (step 4)

Use the data of the delta. Each `describe` is a requirement name, and each `it` is a scenario name.

- [x] `apps/back/src/common/filters/all-exceptions.filter.spec.ts` (NEW) — make the filter with `new AllExceptionsFilter(httpAdapterHost, backErrorHandlers, logSpy)`. The mock `ArgumentsHost` gives `getType()` and the HTTP request and response. The mock response has `headersSent`, `writableEnded` and `destroy: vi.fn()`. The mock `httpAdapter` has `reply: vi.fn()`. Use `vi.useFakeTimers()` for the clock. Set `process.env.NODE_ENV` in each test, and restore it after the test. Requirements: "Error response body", "Full body in development", "Safe body outside development", "Error log of a request", "Response that has already started", "Context that is not HTTP".
- [x] `apps/back/test/error-handling.e2e-spec.ts` (NEW) — "Global exception filter": "Unknown route". Start `AppModule` and send the request with supertest.

Run the tests. They must fail for the expected reason: `AllExceptionsFilter` does not exist, and `GET /no-such-route` returns the NestJS default body.

Result (step 4): 2026-11-26. `pnpm --filter back test` fails as expected: `all-exceptions.filter.spec.ts` stops with `Cannot find module './all-exceptions.filter.js'`. The file has 13 tests, one for each scenario. `pnpm --filter back test:e2e` fails as expected: "Unknown route" gets the NestJS default body `{ statusCode, message, error }`.

## 2. Code (step 5)

- [x] `packages/shared/src/api-response.ts` (NEW) — `BaseResponse`, `ErrorResponse`, `ErrorMetadata`, `ErrorDebug` (EF3).
- [x] `packages/shared/src/index.ts` — add the type exports of `api-response.ts`. Remove the export of `ApiErrorResponse` (EF3).
- [x] `packages/shared/src/api-error.ts` — delete the file (EF3).
- [x] `apps/back/src/common/errors/error.tokens.ts` (NEW) — `ERROR_HANDLERS` and `ERROR_LOGGER` (EF2).
- [x] `apps/back/src/common/errors/to-error-response.ts` (NEW) — `toErrorResponse(appError, path)` builds the full body with `metadata.debug` (EF4, EF5).
- [x] `apps/back/src/common/filters/all-exceptions.filter.ts` (NEW) — the `@Catch()` filter (EF1, EF4–EF8, EF10).
- [x] `apps/back/src/app.module.ts` — add `ERROR_HANDLERS`, `ERROR_LOGGER` and `{ provide: APP_FILTER, useClass: AllExceptionsFilter }` to `providers` (EF2).
- [x] `apps/back/package.json` — set `dev` to `NODE_ENV=development nest start --watch` (EF9).
- [x] `pnpm-workspace.yaml` — add `shellEmulator: true` (EF9).
- [x] `openspec/project.md` §4 — add the registration row "Global exception filter: `apps/back/src/app.module.ts` (`providers`: `APP_FILTER`, `ERROR_HANDLERS`, `ERROR_LOGGER`)" (EF2).
- [x] `openspec/project.md` §8 — add a line: `pnpm dev` runs the back app with `NODE_ENV=development`, so an error response has the debug fields (EF9).
- [x] `docs/error-handling.md` — make §2–§5 agree with the code. Set the status line to "done" when the 4 error handling changes are implemented.

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

Result (step 5): 2026-11-26. All commands pass: `pnpm --filter back test` (4 files, 49 tests), `pnpm --filter back test:e2e` (2 files, 2 tests), `pnpm build` (3 packages), `pnpm lint` (0 warnings, 0 errors). A manual check of `pnpm --filter back dev` gives `metadata.debug` for `GET /nope?token=1`, so `shellEmulator` and `NODE_ENV=development` work.
