import { HTTP_STATUS_MESSAGES } from './http-status-messages.js';

// The error codes of the apps (openspec change 261124-0853, EH1).

export const ErrorCodes = {
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ErrorDefinition {
  /** The HTTP status of the code. */
  status: number;
  /** The default message, for the customer. */
  message: string;
  /** True: the same request can work later. */
  retryable: boolean;
}

/** Gives the text of a status that HTTP_STATUS_MESSAGES always has. */
function statusText(status: number): string {
  return HTTP_STATUS_MESSAGES[status] ?? '';
}

/** The one source of each error code: status, default message, retry flag. */
export const ERROR_TABLE: Readonly<Record<ErrorCode, ErrorDefinition>> = {
  BAD_REQUEST: { status: 400, message: statusText(400), retryable: false },
  VALIDATION_FAILED: {
    status: 400,
    message: 'The request data is not valid.',
    retryable: false,
  },
  UNAUTHORIZED: { status: 401, message: statusText(401), retryable: false },
  FORBIDDEN: { status: 403, message: statusText(403), retryable: false },
  NOT_FOUND: { status: 404, message: statusText(404), retryable: false },
  RESOURCE_NOT_FOUND: {
    status: 404,
    message: 'The item was not found.',
    retryable: false,
  },
  RESOURCE_ALREADY_EXISTS: {
    status: 409,
    message: 'The item already exists.',
    retryable: false,
  },
  TOO_MANY_REQUESTS: { status: 429, message: statusText(429), retryable: true },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: statusText(500),
    retryable: false,
  },
  EXTERNAL_API_ERROR: {
    status: 502,
    message: statusText(502),
    retryable: true,
  },
  TIMEOUT: { status: 504, message: statusText(504), retryable: true },
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

/** True when the value is a key of ERROR_TABLE. */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_TABLE, value);
}
