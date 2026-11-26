# Design — 261126-1154 HTTP error response

The overview, the diagrams and the examples are in [`docs/error-handling.md`](../../../docs/error-handling.md) §4 and §8. This file gives the decisions (§1) and the shapes of the code (§2).

## 1. Decisions

| ID   | Decision                                                                                                                                                                                                                                                                                          | Reason                                                                                                                                                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EF1  | One catch-all filter, `AllExceptionsFilter` with `@Catch()`, handles all exceptions. There is no second filter for `HttpException`.                                                                                                                                                               | All rules of the error response are in one place, so two filters cannot build different bodies.                                                                                                                                                |
| EF2  | `AppModule` registers the filter as the provider `APP_FILTER`, not with `app.useGlobalFilters()`. The filter gets `HttpAdapterHost`, the handlers (token `ERROR_HANDLERS`) and the logger (token `ERROR_LOGGER`) in its constructor. `AppModule` gives `backErrorHandlers` and `logError`.        | The e2e tests build `AppModule` and do not run `main.ts`, so they get the filter too. A unit test gives a spy as the logger.                                                                                                                   |
| EF3  | `packages/shared/src/api-response.ts` holds `BaseResponse`, `ErrorResponse`, `ErrorMetadata` and `ErrorDebug` (§2.1). They replace `ApiErrorResponse`. `message` is a text only. `metadata.errorCode` is required. There is no `exceptionName`.                                                   | The back app builds the error response, and the front app reads it, so both apps use one definition. The front app reads the validation list from `details`. `BaseResponse` is also the parent of the success response (change `261126-1155`). |
| EF4  | `catch()` does the steps of `docs/error-handling.md` §4 in this order: `toAppError()`, the log, the check of the context, the check of a started response, the full body, then the rules outside development, then `httpAdapter.reply()`. `toErrorResponse(appError, path)` builds the full body. | The log comes first, so an error that gets no reply is still in the log. The filter removes the debug fields at the end.                                                                                                                       |
| EF5  | The debug fields `exceptionType`, `stackTrace` and `cause` are in one object, `metadata.debug`. When `isDevelopment()` is `false`, the filter deletes `metadata.debug`. For a status of 500 or more, it also sets `message` to the default message of the code.                                   | One object to delete: a new debug field cannot reach production by mistake. The real message of a 5xx error can show internal details.                                                                                                         |
| EF6  | When `headersSent` is `true`, the filter sends no body. When `writableEnded` is `false`, it calls `response.destroy()`. When `writableEnded` is `true`, it does nothing more.                                                                                                                     | A JSON error in an open body breaks the file, and the status stays `200`. A normal end makes a short file that looks complete. A closed connection tells the client that the download failed. NestJS 12 `StreamableFile` does the same.        |
| EF7  | The filter calls the logger in a `try`/`catch`. When the logger throws, the filter writes one line with `console.error` and continues.                                                                                                                                                            | A bug in a logger must not leave the client with no reply.                                                                                                                                                                                     |
| EF8  | `metadata.path` and the location of the `AppError` are `request.originalUrl` without the part from `?`.                                                                                                                                                                                           | A token in the query must not go to the response or to the log. `originalUrl` keeps the global prefix of the route.                                                                                                                            |
| EF9  | The `dev` script of `apps/back/package.json` is `NODE_ENV=development nest start --watch`. `pnpm-workspace.yaml` gets `shellEmulator: true`.                                                                                                                                                      | Without `NODE_ENV`, no developer sees the full body. The shell of Windows cannot read `NAME=value command`. With `shellEmulator`, pnpm runs the scripts in its own shell on each system.                                                       |
| EF10 | For a context that is not HTTP, the filter logs the `AppError` and returns. The source is `ws`, `rpc` or `graphql` for these context types, and `other` for each other type.                                                                                                                      | The back app has no such context yet. The change that adds one also adds its reply (`docs/error-handling.md` §9). For GraphQL, a filter that returns nothing gives `null` with no error.                                                       |

## 2. Shapes

### 2.1 Response types (EF3)

```ts
// packages/shared/src/api-response.ts
/** The fields of each response body of the back app. */
export interface BaseResponse<T = unknown> {
  success: boolean;
  data: T;
  statusCode: number;
}

/** The body of a request that ends with an exception. */
export interface ErrorResponse extends BaseResponse<null> {
  success: false;
  message: string;
  details?: ErrorDetails;
  metadata: ErrorMetadata;
}

export interface ErrorMetadata {
  timestamp: string;
  path: string; // without the query string
  errorCode: ErrorCode;
  debug?: ErrorDebug; // development only
}

/** The debug fields. Outside development, the filter deletes the whole object. */
export interface ErrorDebug {
  exceptionType: string;
  stackTrace?: string;
  cause?: ErrorCause;
}
```

### 2.2 Filter and registration (EF2)

```ts
// apps/back/src/common/filters/all-exceptions.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(ERROR_HANDLERS) private readonly handlers: ErrorHandler[],
    @Inject(ERROR_LOGGER) private readonly logError: ErrorLogger,
  ) {}
}
```

```ts
// apps/back/src/app.module.ts
providers: [
  { provide: ERROR_HANDLERS, useValue: backErrorHandlers },
  { provide: ERROR_LOGGER, useValue: logError },
  { provide: APP_FILTER, useClass: AllExceptionsFilter },
],
```

`toErrorResponse(appError, path)` in `common/errors/to-error-response.ts` returns the full body: the fields of the requirement "Error response body" and `metadata.debug`.

## 3. Not in this change

| Item                                                                    | Where it goes                       |
| ----------------------------------------------------------------------- | ----------------------------------- |
| The success body `{ success: true, data, statusCode }`                  | Change `261126-1155`                |
| The reply in a WebSocket, gRPC, GraphQL or bot context                  | The change that adds the context    |
| An `error` message for SSE, and the error handler of a `StreamableFile` | The first change with SSE or a file |
| Error messages on the pages of the front app                            | A front change                      |
