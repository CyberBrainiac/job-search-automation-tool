# Design — 261126-1155 Success response body

The overview is in [`docs/error-handling.md`](../../../docs/error-handling.md) §6. This file gives the decisions (§1) and the shapes of the code (§2).

## 1. Decisions

| ID  | Decision                                                                                                                                                                  | Reason                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RI1 | One global interceptor, `ResponseInterceptor`. `AppModule` registers it as the provider `APP_INTERCEPTOR`.                                                                | The e2e tests build `AppModule` and do not run `main.ts`, so they get the interceptor too (as EF2 of change `261126-1154`).                                                                                   |
| RI2 | `packages/shared/src/api-response.ts` gets `SuccessResponse<T> extends BaseResponse<T>` with `success: true`, and `ApiResponse<T> = SuccessResponse<T> \| ErrorResponse`. | `BaseResponse` is the parent of both bodies. `success` tells the two shapes apart, so TypeScript knows the type after `if (body.success)`.                                                                    |
| RI3 | `statusCode` is `response.statusCode` at the time of `map()`. `data` is the result of the handler, or `null` when the result is `undefined`.                              | NestJS 12 sets the status (`@HttpCode()`, `201` for `POST`) before the interceptors run (`router-execution-context.js`). A handler with `@Res({ passthrough: true })` can change it. JSON has no `undefined`. |
| RI4 | The interceptor does not wrap a `StreamableFile`. In a context that is not HTTP, it returns `next.handle()` with no change. An exception goes past `map()` to the filter. | A wrapped `StreamableFile` becomes a JSON of the stream object, and the download breaks. A WebSocket message has its own shape.                                                                               |
| RI5 | There is no decorator to skip the interceptor now.                                                                                                                        | No route needs it yet. Some routes must not be wrapped: SSE, a redirect to a URL from the handler, a webhook. The change that adds the first one adds `@RawResponse()` (`docs/error-handling.md` §9).         |

## 2. Shapes

```ts
// packages/shared/src/api-response.ts (added)
/** The body of a request that ends with no exception. */
export interface SuccessResponse<T> extends BaseResponse<T> {
  success: true;
}

/** What the front app gets. `success` tells the two shapes apart. */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

```ts
// apps/back/src/common/interceptors/response.interceptor.ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) =>
        data instanceof StreamableFile
          ? data
          : ({ success: true, data: data ?? null, statusCode: response.statusCode } satisfies SuccessResponse<unknown>),
      ),
    );
  }
}
```

The front app reads a body with `if (body.success) { ... body.data ... } else { ... body.message ... }`.

## 3. Not in this change

| Item                                             | Where it goes                            |
| ------------------------------------------------ | ---------------------------------------- |
| `@RawResponse()` (RI5)                           | The first route that must not be wrapped |
| An API client in the front app that reads `data` | A front change                           |
