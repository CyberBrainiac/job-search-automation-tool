import type { ErrorCode } from './error-codes.js';

// The plain object that describes one error (openspec change 261124-0853, EH4, EH6, EH7).

export type ErrorSource =
  'http' | 'ws' | 'rpc' | 'graphql' | 'other' | 'job' | 'startup' | 'process';

/** What the client must do to fix the error. Each key is optional. */
export interface ErrorDetails {
  /** The validation messages of the request data. */
  validation?: string[];
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
  /** From ERROR_TABLE. A NestJS exception keeps its own status. */
  status: number;
  /** The real message. Without one, the default message of the code. */
  message: string;
  details?: ErrorDetails;
  /** From ERROR_TABLE. */
  retryable: boolean;
  source: ErrorSource;
  /** The class name, or 'UnknownError'. */
  type: string;
  /** ISO 8601. */
  timestamp: string;
  /** The HTTP path without the query, or the name of the process event. */
  location?: string;
  /** The stack of the thrown error. */
  stack?: string;
  cause?: ErrorCause;
  /** The inner errors of a wrapper error, at most 10. */
  inner?: AppError[];
}
