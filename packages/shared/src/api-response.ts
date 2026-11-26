import type { ErrorCause, ErrorDetails } from './app-error.js';
import type { ErrorCode } from './error-codes.js';

// The response bodies of the back app (openspec change 261126-1154, EF3).

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
  /** The path of the request without the query string. */
  path: string;
  errorCode: ErrorCode;
  /** Development only. */
  debug?: ErrorDebug;
}

/** The debug fields. Outside development, the filter deletes the whole object. */
export interface ErrorDebug {
  exceptionType: string;
  stackTrace?: string;
  cause?: ErrorCause;
}
