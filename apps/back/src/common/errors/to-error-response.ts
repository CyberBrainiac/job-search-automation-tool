import type { AppError, ErrorDebug, ErrorResponse } from '@repo/shared';

/**
 * Builds the full error response, with metadata.debug (openspec change 261126-1154, EF4, EF5).
 * The filter removes the debug fields outside development.
 */
export function toErrorResponse(
  appError: AppError,
  path: string,
): ErrorResponse {
  const debug: ErrorDebug = { exceptionType: appError.type };
  if (appError.stack) debug.stackTrace = appError.stack;
  if (appError.cause) debug.cause = appError.cause;

  const body: ErrorResponse = {
    success: false,
    data: null,
    statusCode: appError.status,
    message: appError.message,
    metadata: {
      timestamp: appError.timestamp,
      path,
      errorCode: appError.code,
      debug,
    },
  };
  if (appError.details) body.details = appError.details;
  return body;
}
