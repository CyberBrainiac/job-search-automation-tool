# Delta for error-handling

Shared data of the examples of this delta:

- The unit tests call `toAppError(error, { source: 'http', location: '/example' })`, except where a scenario gives another context. The back app has no route `/example`.
- The clock of the unit tests is `2026-11-26T08:00:00.000Z`.
- `NODE_ENV` is `production`, except where a scenario gives another value.
- A `SuppressedError` is an `Error` with the name `SuppressedError` and the fields `suppressed` (the first error) and `error` (the later error).

## ADDED Requirements

### Requirement: Business error

`toAppError()` SHALL convert a `CustomException` to an `AppError` with the code of the exception. The status and the retry flag SHALL come from the row of the code in `ERROR_TABLE`.
The message SHALL be the message of the exception. When the exception has no message, the message SHALL be the default message of the code.

#### Scenario: Business error with a message

- **GIVEN** the code throws `new CustomException(ErrorCodes.RESOURCE_NOT_FOUND, 'Vacancy 42 not found')`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'RESOURCE_NOT_FOUND'`, `status: 404`, `retryable: false` and `message: 'Vacancy 42 not found'`
- **AND** the `AppError` has `type: 'CustomException'`, `source: 'http'`, `location: '/example'` and `timestamp: '2026-11-26T08:00:00.000Z'`

#### Scenario: Business error with no message

- **GIVEN** the code throws `new CustomException(ErrorCodes.RESOURCE_NOT_FOUND)`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `status: 404` and `message: 'The item was not found.'`

#### Scenario: Business error with details

- **GIVEN** the code throws `new CustomException(ErrorCodes.VALIDATION_FAILED, 'The vacancy filter is not valid', { details: { validation: ['salary must be a number'] } })`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `status: 400`, `message: 'The vacancy filter is not valid'` and `details: { validation: ['salary must be a number'] }`

### Requirement: Code of an HTTP exception

For an `HttpException` that is not a `CustomException`, the `AppError` SHALL keep the status of the exception. `toAppError()` SHALL use the first rule of this table that agrees with the exception:

| #   | The exception                                                 | Code                                                           |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | The status is not in the range 400–599.                       | `INTERNAL_SERVER_ERROR`, and the status becomes 500.           |
| 2   | `errorCode` of the exception is a code of `ERROR_TABLE`.      | That code                                                      |
| 3   | The message of the response is a list, and the status is 400. | `VALIDATION_FAILED`                                            |
| 4   | `CODE_BY_STATUS` has the status.                              | The code of `CODE_BY_STATUS`                                   |
| 5   | Each other status                                             | `BAD_REQUEST` for 400–499, `INTERNAL_SERVER_ERROR` for 500–599 |

The retry flag SHALL come from the row of the code in `ERROR_TABLE`.

#### Scenario: HTTP exception with a status in the table

- **GIVEN** the code throws `new ForbiddenException()`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'FORBIDDEN'`, `status: 403`, `message: 'Forbidden'` and `type: 'ForbiddenException'`

#### Scenario: HTTP exception with a status not in the table

- **GIVEN** the code throws `new PayloadTooLargeException()`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'BAD_REQUEST'` and `status: 413`

#### Scenario: HTTP exception with a known error code

- **GIVEN** the code throws `new NotFoundException('Vacancy 42 not found', { errorCode: 'RESOURCE_NOT_FOUND' })`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'RESOURCE_NOT_FOUND'` and `status: 404`

#### Scenario: HTTP exception with an unknown error code

- **GIVEN** the code throws `new NotFoundException('Vacancy 42 not found', { errorCode: 'NO_SUCH_CODE' })`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'NOT_FOUND'` and `status: 404`

#### Scenario: HTTP exception with a status out of range

- **GIVEN** the code throws `new HttpException('Moved', 302)`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'` and `status: 500`

### Requirement: Message of an HTTP exception

For an `HttpException` that is not a `CustomException`, the message SHALL be the text of the response of the exception.
When the response is an `Error`, the message SHALL be the default message of the code, and the `Error` SHALL go to `cause`.
When the message is the unknown-route message of the router (`Cannot <method> <path>`), the message SHALL NOT have the query string.

#### Scenario: HTTP exception that holds an error

- **GIVEN** the code throws `new UnauthorizedException(new Error('jwt malformed'))`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'UNAUTHORIZED'`, `status: 401` and `message: 'Sign in to continue.'`
- **AND** `cause` has `type: 'Error'` and `message: 'jwt malformed'`

#### Scenario: Unknown route message with a query

- **GIVEN** the router throws `new NotFoundException('Cannot GET /vacancies?token=abc')`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'NOT_FOUND'` and `message: 'Cannot GET /vacancies'`
- **AND** no field of the `AppError` has the text `token=abc`

### Requirement: Validation messages

When the message of the response of an `HttpException` is a list, `toAppError()` SHALL put the list into `details.validation`. The message SHALL be the default message of the code.

#### Scenario: List of validation messages

- **GIVEN** the code throws `new BadRequestException(['name must be a string', 'url must be a URL'])`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'VALIDATION_FAILED'`, `status: 400` and `message: 'The request data is not valid.'`
- **AND** `details` is `{ validation: ['name must be a string', 'url must be a URL'] }`

#### Scenario: List of messages with another status

- **GIVEN** the code throws `new ConflictException(['name is already used'])`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'RESOURCE_ALREADY_EXISTS'`, `status: 409` and `message: 'The item already exists.'`
- **AND** `details` is `{ validation: ['name is already used'] }`

### Requirement: Unexpected error

For an unexpected error, the `AppError` SHALL have the code `INTERNAL_SERVER_ERROR`, the status 500 and the real message.
For an `Error`, `type` SHALL be its class name and `stack` SHALL be its stack. For a thrown value that is not an `Error`, `type` SHALL be `UnknownError`.
The `AppError` SHALL have the source and the location of the context.

#### Scenario: Unexpected error with the real message

- **GIVEN** the code throws `new TypeError("Cannot read properties of undefined (reading 'id')")`
- **WHEN** `toAppError()` converts the error
- **THEN** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'`, `status: 500`, `retryable: false` and `message: "Cannot read properties of undefined (reading 'id')"`
- **AND** `type` is `'TypeError'`, and `stack` is the `stack` of the error

#### Scenario: Thrown value that is not an error

- **GIVEN** the code throws the string `'boom'`
- **WHEN** `toAppError()` converts the value
- **THEN** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'`, `status: 500`, `message: 'boom'` and `type: 'UnknownError'`
- **AND** the `AppError` has no `stack`

#### Scenario: Error outside a request

- **GIVEN** a job throws `new TypeError('Example failure')`
- **WHEN** `toAppError()` converts the error with the context `{ source: 'job', location: 'fetch-vacancies' }`
- **THEN** the `AppError` has `source: 'job'` and `location: 'fetch-vacancies'`

### Requirement: Timeout error

For an error with the name `TimeoutError`, the `AppError` SHALL have the code `TIMEOUT`, the status 504 and the retry flag `true`.

#### Scenario: Timeout of an operation

- **GIVEN** the code throws `new DOMException('The operation was aborted due to timeout', 'TimeoutError')`
- **WHEN** `toAppError()` converts the error
- **THEN** the `AppError` has `code: 'TIMEOUT'`, `status: 504`, `retryable: true` and `type: 'TimeoutError'`

### Requirement: Cause of an error

When a thrown error has `cause`, the `AppError` SHALL have it in `cause` with its type, its message and its stack. The cause of the cause SHALL go to `cause.cause`.
The chain SHALL stop after 3 errors.

#### Scenario: Error with a cause

- **GIVEN** the code throws `new CustomException(ErrorCodes.EXTERNAL_API_ERROR, 'The job aggregator failed', { cause: new Error('connect ECONNREFUSED 10.0.0.5:443') })`
- **WHEN** `toAppError()` converts the exception
- **THEN** the `AppError` has `code: 'EXTERNAL_API_ERROR'`, `status: 502`, `retryable: true` and `message: 'The job aggregator failed'`
- **AND** `cause` has `type: 'Error'`, `message: 'connect ECONNREFUSED 10.0.0.5:443'` and the `stack` of that error

#### Scenario: Long chain of causes

- **GIVEN** the code throws an `Error` with a chain of 5 causes
- **WHEN** `toAppError()` converts the error
- **THEN** `cause`, `cause.cause` and `cause.cause.cause` have the messages of the first 3 causes
- **AND** `cause.cause.cause` has no `cause`

#### Scenario: Error that is its own cause

- **GIVEN** the code throws an `Error` whose `cause` is the same error
- **WHEN** `toAppError()` converts the error
- **THEN** `toAppError()` returns an `AppError` with a chain of 3 causes

### Requirement: Suppressed error

For a `SuppressedError`, the `AppError` SHALL take these fields from the suppressed error (the first error): the code, the status, the message, the details and the retry flag. This is also true when the code of the suppressed error is `INTERNAL_SERVER_ERROR`.
`type` SHALL be `SuppressedError`. `inner` SHALL have the `AppError` of the suppressed error, then the `AppError` of the later error.

#### Scenario: Cleanup error after a business error

- **GIVEN** the code throws a `SuppressedError` with the suppressed error `new CustomException(ErrorCodes.RESOURCE_NOT_FOUND, 'Vacancy 42 not found')` and the later error `new TypeError('close failed')`
- **WHEN** `toAppError()` converts the error
- **THEN** the `AppError` has `code: 'RESOURCE_NOT_FOUND'`, `status: 404`, `message: 'Vacancy 42 not found'` and `type: 'SuppressedError'`
- **AND** `inner` has 2 items: the first has `code: 'RESOURCE_NOT_FOUND'`, the second has `code: 'INTERNAL_SERVER_ERROR'`

#### Scenario: Business error in the cleanup after an unexpected error

- **GIVEN** the code throws a `SuppressedError` with the suppressed error `new TypeError('read failed')` and the later error `new CustomException(ErrorCodes.RESOURCE_NOT_FOUND)`
- **WHEN** `toAppError()` converts the error
- **THEN** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'`, `status: 500` and `message: 'read failed'`

### Requirement: Aggregate error

For an `AggregateError`, the `AppError` SHALL take the same 5 fields from the first inner error with a code that is not `INTERNAL_SERVER_ERROR`. The 5 fields are the code, the status, the message, the details and the retry flag.
When no inner error has such a code, the `AppError` SHALL have the code `INTERNAL_SERVER_ERROR`, the status 500 and the message of the `AggregateError`.
`type` SHALL be `AggregateError`. `inner` SHALL have the `AppError` of each inner error, with a maximum of 10.

#### Scenario: Aggregate error with a known inner code

- **GIVEN** the code throws `new AggregateError([new TypeError('Aggregator A failed'), new CustomException(ErrorCodes.EXTERNAL_API_ERROR, 'Aggregator B failed')], 'All aggregators failed')`
- **WHEN** `toAppError()` converts the error
- **THEN** the `AppError` has `code: 'EXTERNAL_API_ERROR'`, `status: 502`, `message: 'Aggregator B failed'` and `type: 'AggregateError'`
- **AND** `inner` has 2 items

#### Scenario: Aggregate error with only unexpected errors

- **GIVEN** the code throws `new AggregateError([new TypeError('Aggregator A failed'), new RangeError('Aggregator B failed')], 'All aggregators failed')`
- **WHEN** `toAppError()` converts the error
- **THEN** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'`, `status: 500` and `message: 'All aggregators failed'`

#### Scenario: Aggregate error with many inner errors

- **GIVEN** the code throws an `AggregateError` with 15 inner `TypeError` objects
- **WHEN** `toAppError()` converts the error
- **THEN** `inner` has 10 items

### Requirement: Safe conversion

`toAppError()` SHALL NOT throw. When the conversion fails, the `AppError` SHALL have the code `INTERNAL_SERVER_ERROR`, the status 500 and the type `UnknownError`.

#### Scenario: Thrown value with no text

- **GIVEN** the code throws `Object.create(null)`
- **WHEN** `toAppError()` converts the value
- **THEN** `toAppError()` does not throw
- **AND** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'`, `status: 500` and `type: 'UnknownError'`

#### Scenario: Handler that fails

- **GIVEN** the first error handler of the list throws `new Error('handler bug')` in `canHandle()`
- **WHEN** `toAppError()` converts `new NotFoundException()` with this list
- **THEN** `toAppError()` does not throw
- **AND** the `AppError` has `code: 'INTERNAL_SERVER_ERROR'`, `status: 500` and `type: 'UnknownError'`

### Requirement: Level of the error log

`logError()` SHALL write each line of an `AppError` with the level `error` when one of these is true: the status is 500 or more, an inner error has a status of 500 or more, or the source is not `http`. Else it SHALL use the level `warn`.
The first line SHALL have the status, the code, the source, the location and the message. A wrapper error SHALL have one more line for each inner error.

#### Scenario: Log of a server error

- **GIVEN** an `AppError` with `code: 'INTERNAL_SERVER_ERROR'`, `status: 500`, `source: 'http'`, `location: '/example'` and `message: 'Example failure'`
- **WHEN** `logError()` logs it
- **THEN** `Logger.error` is called one time with a text that has `500`, `INTERNAL_SERVER_ERROR`, `http`, `/example` and `Example failure`
- **AND** `Logger.warn` is not called

#### Scenario: Log of a client error

- **GIVEN** an `AppError` with `code: 'RESOURCE_NOT_FOUND'`, `status: 404`, `source: 'http'`, `location: '/example'` and `message: 'Vacancy 42 not found'`
- **WHEN** `logError()` logs it
- **THEN** `Logger.warn` is called one time with a text that has `404`, `RESOURCE_NOT_FOUND`, `/example` and `Vacancy 42 not found`
- **AND** `Logger.error` is not called

#### Scenario: Log of a client error outside a request

- **GIVEN** an `AppError` with `code: 'RESOURCE_NOT_FOUND'`, `status: 404` and `source: 'job'`
- **WHEN** `logError()` logs it
- **THEN** `Logger.error` is called one time
- **AND** `Logger.warn` is not called

#### Scenario: Log of a wrapper error

- **GIVEN** an `AppError` with `type: 'SuppressedError'`, `status: 404` and 2 inner errors with the status 404 and 500
- **WHEN** `logError()` logs it
- **THEN** `Logger.error` is called 3 times
- **AND** the first text has `inner=2`, the second text has `inner 1/2`, and the third text has `inner 2/2`

### Requirement: One line for one error

When `NODE_ENV` is not `development`, `logError()` SHALL write each error as one line. It SHALL change each `\r` and `\n` in the texts of the line to the 2 characters `\n`.
A line with the level `error` SHALL have the type, the stack and the cause of the `AppError`.
When `NODE_ENV` is `development`, `logError()` SHALL give the stack to `Logger.error` as the second argument.

#### Scenario: Line break in a message (SEC-03.10)

- **GIVEN** an `AppError` with `status: 404`, `source: 'http'` and the message `'Vacancy 42\nERROR 500 FAKE'` with a line break
- **WHEN** `logError()` logs it
- **THEN** the text of the `Logger.warn` call has no line break
- **AND** the text has `Vacancy 42\nERROR 500 FAKE` with the 2 characters `\n`

#### Scenario: Stack in the log line

- **GIVEN** an `AppError` with `status: 500`, `type: 'TypeError'` and a stack of 3 lines
- **WHEN** `logError()` logs it
- **THEN** `Logger.error` is called with one argument: a text with `type=TypeError`, `stack=` and no line break

#### Scenario: Cause in the log line

- **GIVEN** an `AppError` with `status: 502` and a `cause` with `type: 'Error'` and `message: 'connect ECONNREFUSED 10.0.0.5:443'`
- **WHEN** `logError()` logs it
- **THEN** the text of the `Logger.error` call has `cause="Error: connect ECONNREFUSED 10.0.0.5:443"`

#### Scenario: Readable stack in development

- **GIVEN** `NODE_ENV` is `development`
- **AND** an `AppError` with `status: 500` and a stack of 3 lines
- **WHEN** `logError()` logs it
- **THEN** the second argument of the `Logger.error` call is the stack

### Requirement: Safe logger

`logError()` SHALL NOT throw. When the NestJS `Logger` throws, `logError()` SHALL write the line with `console.error`.

#### Scenario: Logger that fails

- **GIVEN** `Logger.prototype.error` throws `new Error('stdout closed')`
- **WHEN** `logError()` logs an `AppError` with `code: 'INTERNAL_SERVER_ERROR'` and `status: 500`
- **THEN** `logError()` does not throw
- **AND** `console.error` is called one time with a text that has `500` and `INTERNAL_SERVER_ERROR`
