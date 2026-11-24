# Design — 261124-0853 Global error handler in the back app

The model is the error handling of the 13hunters back app: `AllExceptionsFilter`, `CustomException`, `ErrorCodes` and `ErrorResponse`. This change keeps its error response and makes the rest smaller. `docs/error-handling.md` has the diagrams.

## 1. Decisions

| ID  | Decision                                                                                                                                                                                                                                                      | Reason                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EH1 | One catch-all filter, `AllExceptionsFilter` with `@Catch()`, handles all exceptions. There is no second filter for `HttpException`.                                                                                                                           | All rules of the error response are in one place, so two filters cannot build different bodies.                                                                                                        |
| EH2 | Register the filter as the provider `APP_FILTER` in `AppModule`. Do not call `app.useGlobalFilters()` in `main.ts`.                                                                                                                                           | The e2e tests build `AppModule` and do not run `main.ts`, so they get the filter too. NestJS also injects `HttpAdapterHost` into the filter.                                                           |
| EH3 | `@repo/shared` holds `BaseResponse`, `ErrorResponse` and `ErrorMetadata` (§2). They replace `ApiErrorResponse`, which has the NestJS default shape.                                                                                                           | The back app builds the error response, and the front app reads it. Both apps use one definition.                                                                                                      |
| EH4 | `ErrorCodes` is a constant object in `@repo/shared`. The type `ErrorCode` is the union of its values.                                                                                                                                                         | This is a value, not only a type (`project.md` §3). The back app needs the value to throw an error, and the front app needs it to compare a code. With one list, the compiler finds a misspelled code. |
| EH5 | `CustomException` extends `HttpException`. Its constructor has 3 required parameters: `message: string`, `status: HttpStatus` and `errorCode: ErrorCode`. It gives `{ message, errorCode }` to `HttpException` as the response.                               | Each business error has an error code that the front app can check.                                                                                                                                    |
| EH6 | For an unexpected error, the filter sends the status `500`, the message `Internal server error` and the error code `INTERNAL_SERVER_ERROR`. The log line keeps the real message and the stack.                                                                | The message of an unexpected error can show internal data, for example a file path or a database detail. The client does not need it.                                                                  |
| EH7 | The filter adds `stackTrace` only when `process.env.NODE_ENV` is `development`. It reads `process.env` directly.                                                                                                                                              | When `NODE_ENV` is not set, the stack stays hidden, so the default is safe. The back app has no `@nestjs/config` yet. The terminal log always shows the stack of a server error.                       |
| EH8 | A service that calls another site (a job aggregator, LinkedIn) catches the error of the call. It writes the error to the log and throws `CustomException` with `502 Bad Gateway` and `EXTERNAL_API_ERROR`. The filter has no rule for an HTTP client library. | The status of the other site, for example its `404`, is not the status of this API. The filter stays small.                                                                                            |

## 2. Shared types

`packages/shared/src/error-codes.ts` (EH4). A change adds a code when it needs a new one.

```ts
export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

`packages/shared/src/api-response.ts` (EH3):

```ts
import type { ErrorCode } from './error-codes.js';

/** The fields of each response body of the back app. */
export interface BaseResponse<T = unknown> {
  success: boolean;
  data: T;
  statusCode: number;
}

/** The body of a request that ends with an exception (AllExceptionsFilter). */
export interface ErrorResponse extends BaseResponse<null> {
  success: false;
  message: string | string[];
  metadata: ErrorMetadata;
}

export interface ErrorMetadata {
  /** ISO 8601. */
  timestamp: string;
  /** The URL of the request, with the query. */
  path: string;
  /** The class name of the error, or `UnknownError` for a value that is not an `Error`. */
  exceptionType: string;
  /** The `name` of the error. */
  exceptionName?: string;
  errorCode?: ErrorCode;
  /** Only when `NODE_ENV` is `development` (EH7). */
  stackTrace?: string;
}
```

The fields are the fields of the 13hunters `ErrorResponse`. There are 3 differences:

- `statusCode` is a `number`, because the front app has no `HttpStatus` of NestJS.
- `ErrorResponse` has no type parameter, and `success` is `false`. The front app can use `success` to tell an error from a success body.
- `errorCode` has the type `ErrorCode`, not `string`.

## 3. Not in this change

| Item                                                                                                                                                         | Where it goes                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| The success body `{ success: true, data, statusCode }` (the 13hunters `BaseResponseInterceptor`). Until then, a success response is the data of the handler. | A later change. It uses `BaseResponse`. |
| A global `ValidationPipe`. Its `400` already fits the requirement "List of messages".                                                                        | The first change with a DTO.            |
| Contexts that are not HTTP, for example WebSocket or a bot. The filter answers HTTP requests only.                                                           | The change that adds the context.       |
| Error messages on the pages of the front app.                                                                                                                | A front change.                         |
