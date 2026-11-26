# Design — 261126-1156 Errors outside requests

The flow and the code are in [`docs/error-handling-improvements.md`](../../../docs/error-handling-improvements.md) §7. They are part of this design. This file gives the decisions.

## 1. Decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                         | Reason                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EO1 | `common/errors/process-error-handlers.ts` has `registerProcessErrorHandlers(target = process, log = logError, exit = process.exit)` and `handleStartupError(error, log = logError, exit = process.exit)`. `main.ts` calls the first one before `bootstrap()`, and gives the second one to `bootstrap().catch()`. | A unit test gives an `EventEmitter` and spies, so the test process does not stop. `main.ts` and the filter use the same `logError` (EH10 of change `261124-0853`). |
| EO2 | `unhandledRejection` gives an `AppError` with the source `process` and the location `unhandledRejection`. The handler logs it and does not stop the process.                                                                                                                                                     | By default, Node stops the process. One failed background promise must not stop the app for all users. The log level is `error`, because the source is not `http`. |
| EO3 | `uncaughtException` gives an `AppError` with the location `uncaughtException`. A startup error gives the source `startup`. In both cases, the handler logs the error, then calls `exit(1)`.                                                                                                                      | After an uncaught exception, the state of the app is not known. A back app that did not start cannot answer requests.                                              |
| EO4 | There is no `runJob()` now. `openspec/project.md` §6 gets the rule: a promise with no `await` gets `.catch((e) => logError(toAppError(e, { source: 'job', location: '<name>' })))`.                                                                                                                              | The back app has no cron job or queue yet. The oxlint rule `no-floating-promises` already finds a promise with no `await`.                                         |

## 2. Not in this change

| Item                         | Where it goes                          |
| ---------------------------- | -------------------------------------- |
| `runJob()` with retries      | The first change with a job (docs §11) |
| A graceful stop on `SIGTERM` | The change that adds a deployment      |
