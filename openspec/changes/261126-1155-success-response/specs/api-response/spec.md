# Delta for api-response

Shared data of the examples of this delta:

- The unit tests call `ResponseInterceptor.intercept()` with a mock HTTP context and a `CallHandler` that returns the result of the handler.
- The status of the mock response is `200`, except where a scenario gives another value.

## ADDED Requirements

### Requirement: Success response body

For an HTTP request that ends with no exception, the back app SHALL send the success response. It SHALL agree with the interface `SuccessResponse` of `@repo/shared`:

| Field        | Value                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| `success`    | `true`                                                                     |
| `data`       | The result of the handler. It is `null` when the handler returns no value. |
| `statusCode` | The status of the response.                                                |

#### Scenario: Text result

- **WHEN** a client sends `GET /`
- **THEN** the back app returns `200 OK`
- **AND** the body is the JSON `{ "success": true, "data": "Hello World!", "statusCode": 200 }`

#### Scenario: Object result

- **GIVEN** the handler returns `{ id: 42, title: 'Backend developer' }`
- **WHEN** the interceptor gets the result
- **THEN** the result is `{ success: true, data: { id: 42, title: 'Backend developer' }, statusCode: 200 }`

#### Scenario: No result

- **GIVEN** the handler returns `undefined`
- **WHEN** the interceptor gets the result
- **THEN** the result is `{ success: true, data: null, statusCode: 200 }`

#### Scenario: Status of the response

- **GIVEN** the status of the response is `201`
- **AND** the handler returns `{ id: 42 }`
- **WHEN** the interceptor gets the result
- **THEN** the result has `statusCode: 201`

### Requirement: Results that keep their shape

The interceptor SHALL NOT wrap a `StreamableFile`. It SHALL NOT change a value of a context that is not HTTP. It SHALL NOT change an exception of the handler.

#### Scenario: File result

- **GIVEN** the handler returns a `StreamableFile`
- **WHEN** the interceptor gets the result
- **THEN** the result is the same `StreamableFile` object

#### Scenario: Value of a context that is not HTTP

- **GIVEN** the context type is `ws`
- **AND** the gateway returns `{ event: 'vacancy', data: 42 }`
- **WHEN** the interceptor gets the result
- **THEN** the result is the same object

#### Scenario: Exception of the handler

- **GIVEN** the handler throws `new NotFoundException('Example 42 not found')`
- **WHEN** the interceptor gets the exception
- **THEN** the result fails with the same exception
