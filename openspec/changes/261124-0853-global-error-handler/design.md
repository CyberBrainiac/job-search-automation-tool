# Design — 261124-0853 Error model and error log in the back app

The overview, the diagrams and the examples are in [`docs/error-handling.md`](../../../docs/error-handling.md). This file gives the decisions (§1) and the shapes of the code (§2).

## 1. Decisions

| ID   | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Reason                                                                                                                                                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EH1  | `ERROR_TABLE` in `packages/shared/src/error-codes.ts` is the one source of each error code: the status, the default message and the retry flag (§2.2). `ErrorCodes` is a constant object, and `ErrorCode` is the union of its values. `ERROR_TABLE` has the type `Record<ErrorCode, ErrorDefinition>`. `CODE_BY_STATUS` gives the default code of a status. `isErrorCode()` checks a text.                                                                                                                                                               | The compiler asks for one row for each code. These are values, not only types (`project.md` §3): the back app needs them to throw and convert an error, and the front app needs them to show the default message and to retry.                                                             |
| EH2  | `HTTP_STATUS_MESSAGES` in `packages/shared/src/http-status-messages.ts` gives the default text of an HTTP error status (§2.1). The statuses are numbers. The generic codes of `ERROR_TABLE` use these texts.                                                                                                                                                                                                                                                                                                                                             | The front app shows a text for a response with no error code, for example a page of a proxy. `@repo/shared` cannot import `HttpStatus` of NestJS, and `HttpStatus.NOT_FOUND` is `404`.                                                                                                     |
| EH3  | `CustomException` extends `HttpException`. The constructor is `(code: ErrorCode, message?: string, options?: { details?: ErrorDetails; cause?: unknown })`. It gives the status of the code, `errorCode` and `cause` to `HttpException`. Without a message, it uses the default message of the code.                                                                                                                                                                                                                                                     | The status of a code cannot be different in two places. `errorCode` and `cause` are options of the NestJS 12 `HttpException`, so other NestJS code sees them too.                                                                                                                          |
| EH4  | `toAppError(error, context, handlers = backErrorHandlers)` asks the error handlers in order (§2.5). The first handler that says yes gives the code, the type, the message and the details. `ERROR_TABLE` gives the status, the retry flag and the default message. An `HttpException` keeps its own status. The order is `CustomException`, `HttpException`, `TimeoutError`, `Error`, any other value.                                                                                                                                                   | A new error type needs one new handler, and the filter does not change. A handler cannot invent a status. NestJS 12 converts the errors of Express middleware with a status below 500 (for example `413` of body-parser) to an `HttpException` before any filter, so they need no handler. |
| EH5  | The `HttpException` handler uses the rules of §2.6. A status outside 400–599 gives `500`. A known `errorCode` wins. A list goes to `details.validation` (`VALIDATION_FAILED` only for `400`). An `Error` response gives the default message and goes to `cause`. The unknown-route message loses its query.                                                                                                                                                                                                                                              | Express can throw inside the filter for a status outside 400–599. `new UnauthorizedException(err)` would send the text of `err`, and NestJS also replaces it. A token in the query of an unknown route must not go to the log.                                                             |
| EH6  | `details` has the type `ErrorDetails`: an object with optional keys. It has one key now, `validation: string[]`. A key answers "What must the client do to fix the error?". There is no second field for the customer.                                                                                                                                                                                                                                                                                                                                   | The compiler tells the front app which keys exist, and a new key breaks nothing. With fixed keys, internal data cannot go to the client by mistake. `message` is the text for the customer.                                                                                                |
| EH7  | `AppError.stack` is the stack of the thrown error. `AppError.cause` is the error in `error.cause` (or the `Error` response of EH5) as an `ErrorCause`: the type, the message, the stack and the next cause. The chain stops after 3 errors.                                                                                                                                                                                                                                                                                                              | The cause shows the real problem of an API integration. The limit stops a loop when an error is its own cause.                                                                                                                                                                             |
| EH8  | `toAppError()` unwraps a wrapper error before the handlers (§2.7). A `SuppressedError` takes the code, the status, the message, the details and the retry flag of `.suppressed`. An `AggregateError` takes them from its first inner error with a code that is not `INTERNAL_SERVER_ERROR`, else it gets `INTERNAL_SERVER_ERROR`. `inner` keeps at most 10 errors. The depth is at most 3. The check of `SuppressedError` uses `error.name`.                                                                                                             | Node 22 has no global `SuppressedError`, so `instanceof SuppressedError` throws `ReferenceError`. TypeScript with `target: ES2023` does not know the type.                                                                                                                                 |
| EH9  | `toAppError()` never throws. A `try`/`catch` around the conversion gives `INTERNAL_SERVER_ERROR` with the type `UnknownError` when a handler fails. A value that is not an `Error` becomes a text with `String()` inside this `try`.                                                                                                                                                                                                                                                                                                                     | An error inside the error handling leaves the client with no reply. `String(Object.create(null))` throws `TypeError`.                                                                                                                                                                      |
| EH10 | `logError` in `common/errors/error-logger.ts` is the one logger (type `ErrorLogger`). It uses the NestJS `Logger`. The level is `error` for a status of 500 or more, an inner error with 500 or more, or a source that is not `http`. Else it is `warn`. Outside development, it changes each `\r` and `\n` to the 2 characters `\n`. Then one error is one line with the type, the stack and the cause. In development, the stack is the second argument of `Logger.error()`. When the NestJS `Logger` throws, it writes the line with `console.error`. | One log function for all errors. A line break from a user value can make a fake log line (SEC-03.10). A stack on extra lines is easy to read on the PC of the developer. A JSON logger and Sentry are later changes.                                                                       |
| EH11 | `isDevelopment()` in `common/environment.ts` returns `process.env.NODE_ENV === 'development'`. It reads the variable at each call.                                                                                                                                                                                                                                                                                                                                                                                                                       | When `NODE_ENV` is not set, the result is `false`, so the safe rules apply. The unit tests change `NODE_ENV`. The back app has no `@nestjs/config` yet.                                                                                                                                    |

## 2. Shapes

### 2.1 Default messages of HTTP statuses (EH2)

`packages/shared/src/http-status-messages.ts` exports `HTTP_STATUS_MESSAGES: Readonly<Partial<Record<number, string>>>`:

| Status | Text                                           |
| ------ | ---------------------------------------------- |
| 400    | The request is not valid.                      |
| 401    | Sign in to continue.                           |
| 403    | You do not have access.                        |
| 404    | Not found.                                     |
| 408    | The request took too long.                     |
| 409    | The request conflicts with the current data.   |
| 413    | The request is too large.                      |
| 422    | The request data is not valid.                 |
| 429    | Too many requests. Try again later.            |
| 500    | Sorry, something bad happened. Try again.      |
| 502    | An external service failed. Try again later.   |
| 503    | The service is not available. Try again later. |
| 504    | The request took too long. Try again later.    |

### 2.2 Error codes (EH1)

| Code                      | Status | Default message                | Retry | Used by                          |
| ------------------------- | ------ | ------------------------------ | ----- | -------------------------------- |
| `BAD_REQUEST`             | 400    | `HTTP_STATUS_MESSAGES[400]`    | no    | NestJS 400, other 4xx            |
| `VALIDATION_FAILED`       | 400    | The request data is not valid. | no    | `ValidationPipe` (message list)  |
| `UNAUTHORIZED`            | 401    | `HTTP_STATUS_MESSAGES[401]`    | no    | NestJS 401                       |
| `FORBIDDEN`               | 403    | `HTTP_STATUS_MESSAGES[403]`    | no    | NestJS 403                       |
| `NOT_FOUND`               | 404    | `HTTP_STATUS_MESSAGES[404]`    | no    | NestJS 404, unknown route        |
| `RESOURCE_NOT_FOUND`      | 404    | The item was not found.        | no    | `CustomException`                |
| `RESOURCE_ALREADY_EXISTS` | 409    | The item already exists.       | no    | `CustomException`, NestJS 409    |
| `TOO_MANY_REQUESTS`       | 429    | `HTTP_STATUS_MESSAGES[429]`    | yes   | NestJS 429 (rate limit)          |
| `INTERNAL_SERVER_ERROR`   | 500    | `HTTP_STATUS_MESSAGES[500]`    | no    | each unexpected error, other 5xx |
| `EXTERNAL_API_ERROR`      | 502    | `HTTP_STATUS_MESSAGES[502]`    | yes   | HTTP client handler, NestJS 502  |
| `TIMEOUT`                 | 504    | `HTTP_STATUS_MESSAGES[504]`    | yes   | `TimeoutError`, NestJS 504       |

```ts
// packages/shared/src/error-codes.ts
export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  // ... one key for each row of the table
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorDefinition {
  status: number; // the HTTP status of the code
  message: string; // the default message, for the customer
  retryable: boolean; // true: the same request can work later
}

export const ERROR_TABLE: Readonly<Record<ErrorCode, ErrorDefinition>> = {
  BAD_REQUEST: { status: 400, message: HTTP_STATUS_MESSAGES[400]!, retryable: false },
  RESOURCE_NOT_FOUND: { status: 404, message: 'The item was not found.', retryable: false },
  // ...
};

/** The default code of a status. */
export const CODE_BY_STATUS: Readonly<Partial<Record<number, ErrorCode>>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'RESOURCE_ALREADY_EXISTS',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'EXTERNAL_API_ERROR',
  504: 'TIMEOUT',
};

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_TABLE, value);
}
```

### 2.3 `AppError` (EH4, EH6, EH7)

```ts
// packages/shared/src/app-error.ts
export type ErrorSource = 'http' | 'ws' | 'rpc' | 'graphql' | 'other' | 'job' | 'startup' | 'process';

/** What the client must do to fix the error. Each key is optional. */
export interface ErrorDetails {
  validation?: string[]; // the validation messages of the request data
}

/** The error that caused an error (`error.cause`). The chain stops after 3 errors. */
export interface ErrorCause {
  type: string;
  message: string;
  stack?: string;
  cause?: ErrorCause;
}

export interface AppError {
  code: ErrorCode;
  status: number; // from ERROR_TABLE. A NestJS exception keeps its own status.
  message: string; // the real message. Without one, the default message of the code.
  details?: ErrorDetails;
  retryable: boolean; // from ERROR_TABLE
  source: ErrorSource;
  type: string; // the class name, or 'UnknownError'
  timestamp: string; // ISO 8601
  location?: string; // the HTTP path without the query, or the name of the process event
  stack?: string; // the stack of the thrown error
  cause?: ErrorCause;
  inner?: AppError[]; // the inner errors of a wrapper error, at most 10
}
```

### 2.4 `CustomException` (EH3)

```ts
// apps/back/src/common/errors/custom.exception.ts
export class CustomException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message?: string,
    options: { details?: ErrorDetails; cause?: unknown } = {},
  );
}
```

The constructor calls `super(message || ERROR_TABLE[code].message, ERROR_TABLE[code].status, { cause: options.cause, errorCode: code })` and keeps `options.details` in the field `details`.

### 2.5 Error handlers (EH4)

```ts
// apps/back/src/common/errors/error-handler.ts
export interface ErrorHandler {
  canHandle(error: unknown): boolean;
  handle(error: unknown): HandledError;
}

export interface HandledError {
  code: ErrorCode;
  type: string;
  status?: number; // only a NestJS exception has its own status
  message?: string; // the real message, when the error has a text
  details?: ErrorDetails;
  cause?: unknown; // only when the cause is not in error.cause (§2.6)
}

export interface ErrorContext {
  source: ErrorSource;
  location?: string;
}
```

`backErrorHandlers` in `error-handlers.ts` has the handlers in this order:

| #   | Handler           | `canHandle()` is true for                 | Result                                                       |
| --- | ----------------- | ----------------------------------------- | ------------------------------------------------------------ |
| 1   | `CustomException` | `error instanceof CustomException`        | its code, message and details                                |
| 2   | `HttpException`   | `error instanceof HttpException`          | the rules of §2.6                                            |
| 3   | `TimeoutError`    | an `Error` with `name === 'TimeoutError'` | `TIMEOUT`                                                    |
| 4   | `Error`           | `error instanceof Error`                  | `INTERNAL_SERVER_ERROR`, the class name and the real message |
| 5   | Other value       | always                                    | `INTERNAL_SERVER_ERROR`, `UnknownError`, `String(error)`     |

For a `DOMException`, the type is its `name`, for example `TimeoutError`.

### 2.6 `HttpException` rules (EH5)

Each list is a chain: the first rule that matches wins.

The code:

1. The status is not 400–599: `INTERNAL_SERVER_ERROR`, and the status becomes `500`.
2. `exception.errorCode` is a code of `ERROR_TABLE` (`isErrorCode()`): that code.
3. The message is a list, and the status is `400`: `VALIDATION_FAILED`.
4. `CODE_BY_STATUS` has the status: that code.
5. Else: `BAD_REQUEST` (400–499) or `INTERNAL_SERVER_ERROR` (500–599).

The message (`exception.getResponse()`):

1. It is a text: that text.
2. It is an `Error`: the default message of the code. The `Error` goes to `HandledError.cause`.
3. Its `message` is a list: the default message of the code. The list goes to `details.validation`.
4. Its `message` is a text: that text.
5. Else: the default message of the code.

Then, when the message matches `Cannot <METHOD> <path>?<query>` (the unknown-route message of the router), the handler removes the part from `?`.

### 2.7 `toAppError()` and wrapper errors (EH8, EH9)

```ts
// apps/back/src/common/errors/to-app-error.ts
const MAX_DEPTH = 3;
const MAX_INNER = 10;

export function toAppError(error: unknown, context: ErrorContext, handlers = backErrorHandlers, depth = 0): AppError {
  try {
    if (depth < MAX_DEPTH && isSuppressedError(error)) {
      const first = toAppError(error.suppressed, context, handlers, depth + 1);
      const later = toAppError(error.error, context, handlers, depth + 1);
      return fromWrapper(error, first, [first, later], context); // the first error wins
    }
    if (depth < MAX_DEPTH && error instanceof AggregateError) {
      const inner = error.errors.slice(0, MAX_INNER).map((e) => toAppError(e, context, handlers, depth + 1));
      const main = inner.find((e) => e.code !== 'INTERNAL_SERVER_ERROR');
      return fromWrapper(error, main ?? internalError(error), inner, context);
    }
    return runHandlers(error, context, handlers); // §2.5, then ERROR_TABLE, stack, cause, context, timestamp
  } catch {
    return fallbackAppError(context); // INTERNAL_SERVER_ERROR, status 500, type UnknownError
  }
}

/** Node 22 has no global SuppressedError, so `instanceof` throws ReferenceError. */
function isSuppressedError(error: unknown): error is Error & { error: unknown; suppressed: unknown } {
  return error instanceof Error && error.name === 'SuppressedError' && 'suppressed' in error && 'error' in error;
}
```

`fromWrapper()` takes the code, the status, the message, the details and the retry flag of the main error. It takes `type`, `stack` and `cause` from the wrapper.

### 2.8 Logger (EH10)

```ts
// apps/back/src/common/errors/error-logger.ts
export type ErrorLogger = (error: AppError) => void;
export const logError: ErrorLogger = (error) => { /* NestJS Logger, context 'AppError' */ };
```

The fields of a line are `<status> <code> <source> <location> "<message>"`. A line with the level `error` also has `type=<type>`, `stack="<stack>"` and `cause="<type>: <message>"`. A wrapper error adds one line `inner <n>/<count>: <status> <code> <type> "<message>"` for each inner error.

## 3. Not in this change

| Item                                                                           | Where it goes                               |
| ------------------------------------------------------------------------------ | ------------------------------------------- |
| The error response and the global exception filter                             | Change `261126-1154`                        |
| The log of errors outside a request                                            | Change `261126-1156`                        |
| The HTTP client handler (axios or fetch) and the handlers of other contexts    | Later changes (`docs/error-handling.md` §9) |
| A global `ValidationPipe`. The `HttpException` handler already reads its list. | The first change with a DTO                 |
