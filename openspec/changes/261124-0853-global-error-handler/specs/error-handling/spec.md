# Delta for error-handling

Shared data of the examples of this delta:

- The unit tests call `AllExceptionsFilter.catch()` with a mock HTTP request `GET /example?page=2`. The back app has no route `/example`.
- The clock of the unit tests is `2026-11-24T08:00:00.000Z`.
- `NODE_ENV` is `production`, except in the scenarios of the requirement "Stack trace in development".

## ADDED Requirements

### Requirement: Error response body

The error response SHALL have the fields `success: false`, `data: null`, `message`, `statusCode` and `metadata`. It SHALL agree with the interface `ErrorResponse` of `@repo/shared`.
`metadata` SHALL have these fields:

| Field           | Value                                                                                   |
| --------------- | --------------------------------------------------------------------------------------- |
| `timestamp`     | The time of the error, in ISO 8601.                                                     |
| `path`          | The URL of the request, with the query.                                                 |
| `exceptionType` | The class name of the error. For a thrown value that is not an `Error`: `UnknownError`. |
| `exceptionName` | The `name` of the error. It is absent for a thrown value that is not an `Error`.        |

#### Scenario: Body of an HTTP exception

- **GIVEN** the handler of the request throws `new NotFoundException('Example not found')`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `404`
- **AND** the body has `success: false`, `data: null`, `message: 'Example not found'` and `statusCode: 404`
- **AND** `metadata` is `{ timestamp: '2026-11-24T08:00:00.000Z', path: '/example?page=2', exceptionType: 'NotFoundException', exceptionName: 'NotFoundException' }`
- **AND** `metadata` has no `errorCode` and no `stackTrace`

### Requirement: List of messages

When the response of an `HttpException` has a list of messages, the error response SHALL keep the list in `message`.
A `ValidationPipe` gives this list for a request body with errors.

#### Scenario: List of validation messages

- **GIVEN** the handler throws `new BadRequestException(['name must be a string', 'url must be a URL'])`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `400`
- **AND** `message` is `['name must be a string', 'url must be a URL']`

### Requirement: Error code of a business error

For a business error, the error response SHALL have the status of the `CustomException` and its error code in `metadata.errorCode`.
For each other `HttpException`, the error response SHALL have no `metadata.errorCode`.

#### Scenario: Business error with an error code

- **GIVEN** the handler throws `new CustomException('Example not found', HttpStatus.NOT_FOUND, ErrorCodes.RESOURCE_NOT_FOUND)`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `404`
- **AND** `message` is `'Example not found'`
- **AND** `metadata.errorCode` is `'RESOURCE_NOT_FOUND'`, and `metadata.exceptionType` is `'CustomException'`

#### Scenario: HTTP exception with no error code

- **GIVEN** the handler throws `new ForbiddenException()`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `403`
- **AND** `metadata` has no `errorCode`

### Requirement: Unexpected error

For an unexpected error, the error response SHALL have the status `500`, the message `Internal server error` and the error code `INTERNAL_SERVER_ERROR`.
When `NODE_ENV` is not `development`, the error response SHALL NOT have the message of the unexpected error.

#### Scenario: Unexpected error with a hidden message

- **GIVEN** the handler throws `new TypeError("Cannot read properties of undefined (reading 'id')")`
- **WHEN** the filter catches the error
- **THEN** the filter replies with the status `500`
- **AND** `message` is `'Internal server error'`, and `metadata.errorCode` is `'INTERNAL_SERVER_ERROR'`
- **AND** `metadata.exceptionType` is `'TypeError'`
- **AND** no field of the body has the text `Cannot read properties`

#### Scenario: Thrown value that is not an error

- **GIVEN** the handler throws the string `'boom'`
- **WHEN** the filter catches the value
- **THEN** the filter replies with the status `500`
- **AND** `message` is `'Internal server error'`
- **AND** `metadata.exceptionType` is `'UnknownError'`, and `metadata` has no `exceptionName`

### Requirement: Stack trace in development

The error response SHALL have `metadata.stackTrace` only when `NODE_ENV` is `development`.

#### Scenario: Stack trace in development

- **GIVEN** `NODE_ENV` is `development`
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** `metadata.stackTrace` is the `stack` of the error

#### Scenario: No stack trace in production

- **GIVEN** `NODE_ENV` is `production`
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** `metadata` has no `stackTrace`

#### Scenario: No stack trace with no environment

- **GIVEN** `NODE_ENV` is not set
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** `metadata` has no `stackTrace`

### Requirement: Error log

The filter SHALL write one log line for each error. For the status `500` or higher, the line SHALL have the level `error`, the real message and the stack.
For a lower status, the line SHALL have the level `warn`, the status, the message and the path.

#### Scenario: Log of a server error

- **GIVEN** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** the filter calls `Logger.error` one time
- **AND** the text of the log line has `500` and `Example failure`, and the second argument is the `stack` of the error
- **AND** the filter does not call `Logger.warn`

#### Scenario: Log of a client error

- **GIVEN** the handler throws `new NotFoundException('Example not found')`
- **WHEN** the filter catches the exception
- **THEN** the filter calls `Logger.warn` one time with a text that has `404`, `Example not found` and `/example?page=2`
- **AND** the filter does not call `Logger.error`

### Requirement: Global exception filter

The back app SHALL send the error response for each request that ends with an exception, on each route. This includes a route that does not exist.

#### Scenario: Unknown route

- **WHEN** a client sends `GET /no-such-route`
- **THEN** the back app returns `404 Not Found`
- **AND** the body has `success: false`, `data: null` and `statusCode: 404`
- **AND** `metadata.path` is `/no-such-route`, and `metadata.exceptionType` is `NotFoundException`
