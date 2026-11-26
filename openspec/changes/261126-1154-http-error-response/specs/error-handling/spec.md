# Delta for error-handling

Shared data of the examples of this delta:

- The unit tests call `AllExceptionsFilter.catch()` with a mock HTTP request `GET /example?page=2`. The back app has no route `/example`.
- The filter gets the handlers `backErrorHandlers` and a spy as the logger.
- The clock of the unit tests is `2026-11-26T08:00:00.000Z`.
- The response has not started (`headersSent` is `false`), except in the scenarios of the requirement "Response that has already started".
- `NODE_ENV` is `production`, except where a scenario gives another value.

## ADDED Requirements

### Requirement: Error response body

For an HTTP request that ends with an exception, the filter SHALL reply with the status of the `AppError` and the error response. The error response SHALL agree with the interface `ErrorResponse` of `@repo/shared`:

| Field                | Value                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `success`            | `false`                                                                                    |
| `data`               | `null`                                                                                     |
| `statusCode`         | The status of the `AppError`.                                                              |
| `message`            | The message of the `AppError`. The requirement "Safe body outside development" changes it. |
| `details`            | The details of the `AppError`. It is absent when the `AppError` has no details.            |
| `metadata.timestamp` | The timestamp of the `AppError`.                                                           |
| `metadata.path`      | The path of the request, with no query string.                                             |
| `metadata.errorCode` | The code of the `AppError`.                                                                |

#### Scenario: Body of a business error

- **GIVEN** the handler of the request throws `new CustomException(ErrorCodes.RESOURCE_NOT_FOUND, 'Example 42 not found')`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `404`
- **AND** the body is `{ success: false, data: null, statusCode: 404, message: 'Example 42 not found', metadata: { timestamp: '2026-11-26T08:00:00.000Z', path: '/example', errorCode: 'RESOURCE_NOT_FOUND' } }`

#### Scenario: Body of a validation error

- **GIVEN** the handler throws `new BadRequestException(['name must be a string', 'url must be a URL'])`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `400`
- **AND** the body has `message: 'The request data is not valid.'`, `details: { validation: ['name must be a string', 'url must be a URL'] }` and `metadata.errorCode: 'VALIDATION_FAILED'`

### Requirement: Full body in development

When `NODE_ENV` is `development`, the error response SHALL have the real message for each status. It SHALL have `metadata.debug` with these fields:

| Field           | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| `exceptionType` | The type of the `AppError`.                                       |
| `stackTrace`    | The stack of the `AppError`. It is absent when there is no stack. |
| `cause`         | The cause of the `AppError`. It is absent when there is no cause. |

#### Scenario: Unexpected error in development

- **GIVEN** `NODE_ENV` is `development`
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** the filter replies with the status `500`
- **AND** the body has `message: 'Example failure'` and `metadata.errorCode: 'INTERNAL_SERVER_ERROR'`
- **AND** `metadata.debug.exceptionType` is `'TypeError'`, and `metadata.debug.stackTrace` is the `stack` of the error

#### Scenario: Cause in development

- **GIVEN** `NODE_ENV` is `development`
- **AND** the handler throws `new CustomException(ErrorCodes.EXTERNAL_API_ERROR, 'The job aggregator failed', { cause: new Error('connect ECONNREFUSED 10.0.0.5:443') })`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `502`
- **AND** the body has `message: 'The job aggregator failed'`
- **AND** `metadata.debug.cause` has `type: 'Error'` and `message: 'connect ECONNREFUSED 10.0.0.5:443'`

### Requirement: Safe body outside development

When `NODE_ENV` is not `development`, the error response SHALL NOT have `metadata.debug`.
For a status of 500 or more, `message` SHALL be the default message of the code in `ERROR_TABLE`. For a lower status, `message` SHALL be the message of the `AppError`.

#### Scenario: Unexpected error in production

- **GIVEN** the handler throws `new TypeError("Cannot read properties of undefined (reading 'id')")`
- **WHEN** the filter catches the error
- **THEN** the filter replies with the status `500`
- **AND** the body has `message: 'Sorry, something bad happened. Try again.'` and `metadata.errorCode: 'INTERNAL_SERVER_ERROR'`
- **AND** `metadata` has no `debug`, and no field of the body has the text `Cannot read properties`

#### Scenario: Business server error in production

- **GIVEN** the handler throws `new CustomException(ErrorCodes.EXTERNAL_API_ERROR, 'Aggregator X failed', { cause: new Error('connect ECONNREFUSED 10.0.0.5:443') })`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `502`
- **AND** the body has `message: 'An external service failed. Try again later.'`
- **AND** `metadata` has no `debug`, and no field of the body has the text `ECONNREFUSED`

#### Scenario: Client error in production

- **GIVEN** the handler throws `new NotFoundException('Example 42 not found')`
- **WHEN** the filter catches the exception
- **THEN** the filter replies with the status `404`
- **AND** the body has `message: 'Example 42 not found'` and `metadata.errorCode: 'NOT_FOUND'`
- **AND** `metadata` has no `debug`

#### Scenario: No environment

- **GIVEN** `NODE_ENV` is not set
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** the body has `message: 'Sorry, something bad happened. Try again.'`
- **AND** `metadata` has no `debug`

### Requirement: Error log of a request

The filter SHALL give the `AppError` to the logger one time, before it replies. The `AppError` SHALL have the source `http` and the path of the request with no query string as the location.
When the logger throws, the filter SHALL write one line with `console.error` and SHALL send the reply.

#### Scenario: Logger gets the error

- **GIVEN** the handler throws `new NotFoundException('Example 42 not found')`
- **WHEN** the filter catches the exception
- **THEN** the logger is called one time with an `AppError` with `code: 'NOT_FOUND'`, `status: 404`, `source: 'http'` and `location: '/example'`

#### Scenario: Reply when the logger fails

- **GIVEN** the logger throws `new Error('disk full')`
- **AND** the handler throws `new NotFoundException('Example 42 not found')`
- **WHEN** the filter catches the exception
- **THEN** the filter does not throw, and `console.error` is called one time
- **AND** the filter replies with the status `404`

### Requirement: Response that has already started

When the response has started (`headersSent` is `true`), the filter SHALL log the `AppError` and SHALL NOT send an error response.
When the body is not complete (`writableEnded` is `false`), the filter SHALL close the connection with `response.destroy()`.

#### Scenario: Error after the full response

- **GIVEN** the response has `headersSent: true` and `writableEnded: true`
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** the logger is called one time
- **AND** the filter does not call `httpAdapter.reply` and does not call `response.destroy`

#### Scenario: Error in the middle of the body

- **GIVEN** the response has `headersSent: true` and `writableEnded: false`
- **AND** the handler throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** the logger is called one time
- **AND** the filter does not call `httpAdapter.reply`
- **AND** the filter calls `response.destroy` one time

### Requirement: Context that is not HTTP

For a context that is not HTTP, the filter SHALL give the `AppError` to the logger and SHALL NOT reply.
The source SHALL be `ws`, `rpc` or `graphql` for these context types, and `other` for each other type.

#### Scenario: Error in a WebSocket context

- **GIVEN** the context type is `ws`
- **AND** the gateway throws `new TypeError('Example failure')`
- **WHEN** the filter catches the error
- **THEN** the logger is called one time with an `AppError` with `source: 'ws'`
- **AND** the filter does not call `httpAdapter.reply`

### Requirement: Global exception filter

The back app SHALL send the error response for each request that ends with an exception, on each route. This includes a route that does not exist.

#### Scenario: Unknown route

- **WHEN** a client sends `GET /no-such-route?token=abc`
- **THEN** the back app returns `404 Not Found`
- **AND** the body has `success: false`, `data: null`, `statusCode: 404` and `message: 'Cannot GET /no-such-route'`
- **AND** `metadata.errorCode` is `NOT_FOUND`, and `metadata.path` is `/no-such-route`
- **AND** the body has no text `token=abc`, and `metadata` has no `debug`
