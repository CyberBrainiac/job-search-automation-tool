# Delta for error-handling

Shared data of the examples of this delta:

- The unit tests call `registerProcessErrorHandlers(target, log, exit)` with an `EventEmitter` as the target, and with spies as `log` and `exit`.
- The unit tests call `handleStartupError(error, log, exit)` with the same spies.

## ADDED Requirements

### Requirement: Promise rejection that no code catches

The back app SHALL log each promise rejection that no code catches. The `AppError` SHALL have the source `process` and the location `unhandledRejection`.
The back app SHALL keep running.

#### Scenario: Rejected promise with no catch

- **WHEN** the target sends the event `unhandledRejection` with `new TypeError('Example failure')`
- **THEN** `log` is called one time with an `AppError` with `code: 'INTERNAL_SERVER_ERROR'`, `source: 'process'`, `location: 'unhandledRejection'` and `message: 'Example failure'`
- **AND** `exit` is not called

### Requirement: Uncaught exception

The back app SHALL log each exception that no code catches. The `AppError` SHALL have the source `process` and the location `uncaughtException`.
After the log, the back app SHALL stop with the exit code 1.

#### Scenario: Exception that nothing catches

- **WHEN** the target sends the event `uncaughtException` with `new RangeError('Example failure')`
- **THEN** `log` is called one time with an `AppError` with `source: 'process'` and `location: 'uncaughtException'`
- **AND** `exit` is called one time with `1`, after `log`

### Requirement: Startup error

When `bootstrap()` fails, the back app SHALL log the error with the source `startup`. After the log, the back app SHALL stop with the exit code 1.

#### Scenario: Port already in use

- **WHEN** `handleStartupError()` gets `new Error('listen EADDRINUSE: address already in use :::3000')`
- **THEN** `log` is called one time with an `AppError` with `source: 'startup'` and a message that has `EADDRINUSE`
- **AND** `exit` is called one time with `1`, after `log`
