# Design — 261126-1155 Success response body

The types and the code of the interceptor are in [`docs/error-handling-improvements.md`](../../../docs/error-handling-improvements.md) §3.4. They are part of this design. This file gives the decisions.

## 1. Decisions

| ID  | Decision                                                                                                                                                                  | Reason                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RI1 | One global interceptor, `ResponseInterceptor`. `AppModule` registers it as the provider `APP_INTERCEPTOR`.                                                                | The e2e tests build `AppModule` and do not run `main.ts`, so they get the interceptor too (as EF2 of change `261126-1154`).                                                                                   |
| RI2 | `packages/shared/src/api-response.ts` gets `SuccessResponse<T> extends BaseResponse<T>` with `success: true`, and `ApiResponse<T> = SuccessResponse<T> \| ErrorResponse`. | `BaseResponse` is the parent of both bodies. `success` tells the two shapes apart, so TypeScript knows the type after `if (body.success)`.                                                                    |
| RI3 | `statusCode` is `response.statusCode` at the time of `map()`. `data` is the result of the handler, or `null` when the result is `undefined`.                              | NestJS 12 sets the status (`@HttpCode()`, `201` for `POST`) before the interceptors run (`router-execution-context.js`). A handler with `@Res({ passthrough: true })` can change it. JSON has no `undefined`. |
| RI4 | The interceptor does not wrap a `StreamableFile`. In a context that is not HTTP, it returns `next.handle()` with no change. An exception goes past `map()` to the filter. | A wrapped `StreamableFile` becomes a JSON of the stream object, and the download breaks. A WebSocket message has its own shape.                                                                               |
| RI5 | There is no decorator to skip the interceptor now.                                                                                                                        | No route needs it yet. Some routes must not be wrapped: SSE, a redirect to a URL from the handler, a webhook. The change that adds the first one adds `@RawResponse()` (docs §11).                            |

## 2. Not in this change

| Item                                             | Where it goes                            |
| ------------------------------------------------ | ---------------------------------------- |
| `@RawResponse()` (RI5)                           | The first route that must not be wrapped |
| An API client in the front app that reads `data` | A front change                           |
