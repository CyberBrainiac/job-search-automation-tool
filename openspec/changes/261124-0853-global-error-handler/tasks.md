# Tasks — 261124-0853 Global error handler in the back app

## 1. Unit tests (step 4)

Use the data of the delta. Each `describe` is a requirement name, and each `it` is a scenario name.

- [ ] `apps/back/src/common/filters/all-exceptions.filter.spec.ts` (NEW) — call `catch()` with a mock `ArgumentsHost` and a mock `HttpAdapterHost`. Spy on `Logger.prototype.error` and `Logger.prototype.warn`. Use `vi.useFakeTimers()` for the clock. Set `process.env.NODE_ENV` in each test, and restore it after the test. Requirements: "Error response body", "List of messages", "Error code of a business error", "Unexpected error", "Stack trace in development", "Error log".
- [ ] `apps/back/test/error-handling.e2e-spec.ts` (NEW) — "Global exception filter": "Unknown route". Start `AppModule` and send the request with supertest.

Run the tests. They must fail for the expected reason: `AllExceptionsFilter` and `CustomException` do not exist, and `GET /no-such-route` returns the NestJS default body.

Result (step 4): –

## 2. Code (step 5)

- [ ] `packages/shared/src/error-codes.ts` (NEW) — `ErrorCodes` and `ErrorCode` (`design.md` §2, EH4).
- [ ] `packages/shared/src/api-response.ts` (NEW) — `BaseResponse`, `ErrorResponse` and `ErrorMetadata` (`design.md` §2, EH3).
- [ ] `packages/shared/src/index.ts` — add `export { ErrorCodes } from './error-codes.js'` and the type exports of the new files (EH3, EH4).
- [ ] `packages/shared/src/api-error.ts` — delete the file and its export in `index.ts` (EH3).
- [ ] `apps/back/src/common/exceptions/custom.exception.ts` (NEW) — `CustomException(message, status, errorCode)` (EH5).
- [ ] `apps/back/src/common/filters/all-exceptions.filter.ts` (NEW) — the `@Catch()` filter. It builds the `ErrorResponse`, writes the log line and replies with `HttpAdapterHost` (EH1, EH6, EH7).
- [ ] `apps/back/src/app.module.ts` — add `{ provide: APP_FILTER, useClass: AllExceptionsFilter }` to `providers` (EH2).
- [ ] `openspec/project.md` §3 — add the row `apps/back/src/common/`: code that all back modules use (filters, exceptions).
- [ ] `openspec/project.md` §4 — add the registration row "Global exception filter: `apps/back/src/app.module.ts` (`providers`, `APP_FILTER`)" (EH2).
- [ ] `openspec/project.md` §6 — add the row "Errors": throw `CustomException` with a code of `ErrorCodes`, add a new code to `packages/shared/src/error-codes.ts`, and convert the error of an external call (EH5, EH8).
- [ ] `docs/error-handling.md` — set the status to "done". Update the diagrams when the code is different from them.
- [ ] At the archive (README §9): make `openspec/specs/error-handling/spec.md`. Its purpose: the back app sends one error response for each request that ends with an exception, and the front app reads the error code.

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

Result (step 5): –
