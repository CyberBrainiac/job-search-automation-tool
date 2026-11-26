import type { ErrorCode, ErrorDetails, ErrorSource } from '@repo/shared';

// The contract of an error handler (openspec change 261124-0853, EH4).

/** Converts one error type for toAppError(). */
export interface ErrorHandler {
  canHandle(error: unknown): boolean;
  handle(error: unknown): HandledError;
}

/** What a handler knows about an error. toAppError() adds the rest from ERROR_TABLE. */
export interface HandledError {
  code: ErrorCode;
  type: string;
  /** Only a NestJS exception has its own status. */
  status?: number;
  /** The real message, when the error has a text. */
  message?: string;
  details?: ErrorDetails;
  /** Only when the cause is not in error.cause. */
  cause?: unknown;
}

/** Where the error happened. */
export interface ErrorContext {
  source: ErrorSource;
  location?: string;
}
