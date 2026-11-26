# Tasks — 261124-0853 Error model and error log in the back app

## 1. Unit tests (step 4)

Use the data of the delta. Each `describe` is a requirement name, and each `it` is a scenario name.

- [ ] `apps/back/src/common/errors/to-app-error.spec.ts` (NEW) — call `toAppError()` with the context `{ source: 'http', location: '/example' }`, except where a scenario gives another context. Use `vi.useFakeTimers()` and `vi.setSystemTime()` for the clock. Make a `SuppressedError` with `Object.assign(new Error('An error was suppressed during disposal.'), { name: 'SuppressedError', suppressed, error })`, because Node 22 has no `SuppressedError`. Requirements: "Business error", "Code of an HTTP exception", "Message of an HTTP exception", "Validation messages", "Unexpected error", "Timeout error", "Cause of an error", "Suppressed error", "Aggregate error", "Safe conversion".
- [ ] `apps/back/src/common/errors/error-logger.spec.ts` (NEW) — call `logError()` with `AppError` objects. Spy on `Logger.prototype.error`, `Logger.prototype.warn` and `console.error`. Set `process.env.NODE_ENV` in each test, and restore it after the test. Requirements: "Level of the error log", "One line for one error", "Safe logger".

Run the tests. They must fail for the expected reason: the files `to-app-error.ts`, `error-logger.ts` and `custom.exception.ts` do not exist.

Result (step 4): –

## 2. Code (step 5)

- [ ] `packages/shared/src/http-status-messages.ts` (NEW) — `HTTP_STATUS_MESSAGES` (EH2).
- [ ] `packages/shared/src/error-codes.ts` (NEW) — `ErrorCodes`, `ErrorCode`, `ErrorDefinition`, `ERROR_TABLE`, `CODE_BY_STATUS`, `isErrorCode()` (EH1).
- [ ] `packages/shared/src/app-error.ts` (NEW) — `AppError`, `ErrorDetails`, `ErrorCause`, `ErrorSource` (EH4, EH6, EH7).
- [ ] `packages/shared/src/index.ts` — export the values with `export { ... }` and the types with `export type { ... }` (EH1, EH2).
- [ ] `apps/back/src/common/environment.ts` (NEW) — `isDevelopment()` (EH11).
- [ ] `apps/back/src/common/errors/custom.exception.ts` (NEW) — `CustomException` (EH3).
- [ ] `apps/back/src/common/errors/error-handler.ts` (NEW) — `ErrorHandler`, `HandledError`, `ErrorContext` (EH4).
- [ ] `apps/back/src/common/errors/error-handlers.ts` (NEW) — the handlers and the list `backErrorHandlers` (EH4, EH5).
- [ ] `apps/back/src/common/errors/to-app-error.ts` (NEW) — `toAppError()`, the wrapper step and the cause chain (EH4, EH7, EH8, EH9).
- [ ] `apps/back/src/common/errors/error-logger.ts` (NEW) — `ErrorLogger` and `logError` (EH10).
- [ ] `openspec/project.md` §3 — add the row `apps/back/src/common/`: code that all back modules use (errors, filters, interceptors).
- [ ] `openspec/project.md` §3 "Shared package" — add the line: `error-codes.ts` and `http-status-messages.ts` hold values (EH1, EH2).
- [ ] `openspec/project.md` §6 — add the row "Errors": throw `CustomException` with a code of `ErrorCodes`; add a new code to `ERROR_TABLE`; write a 4xx message for the customer, with no internal details (EH3).
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

Result (step 5): –
