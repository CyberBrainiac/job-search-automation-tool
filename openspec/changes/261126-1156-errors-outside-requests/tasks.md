# Tasks — 261126-1156 Errors outside requests

## 1. Unit tests (step 4)

Use the data of the delta. Each `describe` is a requirement name, and each `it` is a scenario name.

- [ ] `apps/back/src/common/errors/process-error-handlers.spec.ts` (NEW) — call `registerProcessErrorHandlers(target, logSpy, exitSpy)` with `new EventEmitter()` from `node:events` as the target. Send the events with `target.emit()`. Call `handleStartupError(error, logSpy, exitSpy)`. Requirements: "Promise rejection that no code catches", "Uncaught exception", "Startup error".

Run the tests. They must fail for the expected reason: `process-error-handlers.ts` does not exist.

Result (step 4): –

## 2. Code (step 5)

- [ ] `apps/back/src/common/errors/process-error-handlers.ts` (NEW) — `registerProcessErrorHandlers()` and `handleStartupError()` (EO1, EO2, EO3).
- [ ] `apps/back/src/main.ts` — call `registerProcessErrorHandlers()` before `bootstrap()`. Replace `await bootstrap();` with `await bootstrap().catch((error: unknown) => handleStartupError(error));` (EO1).
- [ ] `openspec/project.md` §6 — add the rule for a promise with no `await` to the row "Errors" (EO4).

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
