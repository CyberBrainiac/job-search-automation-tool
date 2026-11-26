# Tasks — 261124-0853 Error model and error log in the back app

## 1. Unit tests (step 4)

Use the data of the delta. Each `describe` is a requirement name, and each `it` is a scenario name.

- [x] `apps/back/src/common/errors/to-app-error.spec.ts` (NEW) — call `toAppError()` with the context `{ source: 'http', location: '/example' }`, except where a scenario gives another context. Use `vi.useFakeTimers()` and `vi.setSystemTime()` for the clock. Make a `SuppressedError` with `Object.assign(new Error('An error was suppressed during disposal.'), { name: 'SuppressedError', suppressed, error })`, because Node 22 has no `SuppressedError`. Requirements: "Business error", "Code of an HTTP exception", "Message of an HTTP exception", "Validation messages", "Unexpected error", "Timeout error", "Cause of an error", "Suppressed error", "Aggregate error", "Safe conversion".
- [x] `apps/back/src/common/errors/error-logger.spec.ts` (NEW) — call `logError()` with `AppError` objects. Spy on `Logger.prototype.error`, `Logger.prototype.warn` and `console.error`. Set `process.env.NODE_ENV` in each test, and restore it after the test. Requirements: "Level of the error log", "One line for one error", "Safe logger".

Run the tests. They must fail for the expected reason: the files `to-app-error.ts`, `error-logger.ts` and `custom.exception.ts` do not exist.

- [x] `apps/back/vitest.config.ts` and `apps/back/vitest.config.e2e.ts` — the alias `@repo/shared` points to `packages/shared/src/index.ts`, so the tests need no build of the package.

Result (step 4): 2026-11-26. `pnpm --filter back test` fails as expected: the 2 spec files stop with `Cannot find module './custom.exception.js'` and `Cannot find module './error-logger.js'`. The 2 files have 35 tests, one for each scenario (26 in `to-app-error.spec.ts`, 9 in `error-logger.spec.ts`).

## 2. Code (step 5)

- [x] `packages/shared/src/http-status-messages.ts` (NEW) — `HTTP_STATUS_MESSAGES` (EH2).
- [x] `packages/shared/src/error-codes.ts` (NEW) — `ErrorCodes`, `ErrorCode`, `ErrorDefinition`, `ERROR_TABLE`, `CODE_BY_STATUS`, `isErrorCode()` (EH1).
- [x] `packages/shared/src/app-error.ts` (NEW) — `AppError`, `ErrorDetails`, `ErrorCause`, `ErrorSource` (EH4, EH6, EH7).
- [x] `packages/shared/src/index.ts` — export the values with `export { ... }` and the types with `export type { ... }` (EH1, EH2).
- [x] `apps/back/src/common/environment.ts` (NEW) — `isDevelopment()` (EH11).
- [x] `apps/back/src/common/errors/custom.exception.ts` (NEW) — `CustomException` (EH3).
- [x] `apps/back/src/common/errors/error-handler.ts` (NEW) — `ErrorHandler`, `HandledError`, `ErrorContext` (EH4).
- [x] `apps/back/src/common/errors/error-handlers.ts` (NEW) — the handlers and the list `backErrorHandlers` (EH4, EH5).
- [x] `apps/back/src/common/errors/to-app-error.ts` (NEW) — `toAppError()`, the wrapper step and the cause chain (EH4, EH7, EH8, EH9).
- [x] `apps/back/src/common/errors/error-logger.ts` (NEW) — `ErrorLogger` and `logError` (EH10).
- [x] `openspec/project.md` §3 — add the row `apps/back/src/common/`: code that all back modules use (errors, filters, interceptors).
- [x] `openspec/project.md` §3 "Shared package" — add the line: `error-codes.ts` and `http-status-messages.ts` hold values (EH1, EH2).
- [x] `openspec/project.md` §6 — add the row "Errors": throw `CustomException` with a code of `ErrorCodes`; add a new code to `ERROR_TABLE`; write a 4xx message for the customer, with no internal details (EH3).
- [ ] At the archive (README §9): make `openspec/specs/error-handling/spec.md`. Its purpose: the back app turns each error into one `AppError`, logs it, and sends one error response for each request that ends with an exception.

## 3. Checks

```bash
pnpm --filter back test
```

```bash
pnpm build
```

```bash
pnpm lint
```

Result (step 5): 2026-11-26. All commands pass: `pnpm --filter back test` (3 files, 36 tests), `pnpm build` (3 packages), `pnpm lint` (0 warnings, 0 errors). `pnpm --filter back test:e2e` also passes.

Note: the stack of an `HttpException` starts with its message. `toAppError()` also removes the query of the unknown-route message from the stack, so `token=abc` is not in any field.
