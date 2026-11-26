import { HttpException } from '@nestjs/common';
import { CODE_BY_STATUS, isErrorCode } from '@repo/shared';
import type { ErrorCode } from '@repo/shared';
import type { ErrorHandler, HandledError } from './error-handler.js';
import { CustomException } from './custom.exception.js';

// The error handlers of the back app (openspec change 261124-0853, EH4, EH5).

/** The class name of an error. A DOMException uses its name, for example 'TimeoutError'. */
export function errorType(error: Error): string {
  if (error instanceof DOMException) return error.name;
  return error.constructor?.name || error.name;
}

/** Removes the query from the unknown-route message: 'Cannot GET /a?token=1' -> 'Cannot GET /a'. */
export function removeRouteQuery(text: string): string {
  return text.replace(/(Cannot [A-Z]+ [^?\s]*)\?\S*/g, '$1');
}

const customExceptionHandler: ErrorHandler = {
  canHandle: (error) => error instanceof CustomException,
  handle: (error) => {
    const exception = error as CustomException;
    return {
      code: exception.code,
      type: errorType(exception),
      message: exception.message,
      details: exception.details,
    };
  },
};

/** The `message` list of a response such as `{ message: ['name must be a string'] }`. */
function messageList(response: unknown): string[] | undefined {
  if (typeof response !== 'object' || response === null) return undefined;
  const { message } = response as { message?: unknown };
  return Array.isArray(message) ? message.map(String) : undefined;
}

/** The code rules of EH5 (`design.md` §2.6). The first rule that matches wins. */
function httpCode(
  exception: HttpException,
  status: number,
  list: string[] | undefined,
): ErrorCode {
  if (isErrorCode(exception.errorCode)) return exception.errorCode;
  if (list && status === 400) return 'VALIDATION_FAILED';
  return (
    CODE_BY_STATUS[status] ??
    (status < 500 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR')
  );
}

const httpExceptionHandler: ErrorHandler = {
  canHandle: (error) => error instanceof HttpException,
  handle: (error) => {
    const exception = error as HttpException;
    const response: unknown = exception.getResponse();
    const list = messageList(response);
    let status = exception.getStatus();
    let code: ErrorCode;
    if (!Number.isInteger(status) || status < 400 || status > 599) {
      status = 500;
      code = 'INTERNAL_SERVER_ERROR';
    } else {
      code = httpCode(exception, status, list);
    }

    const result: HandledError = { code, status, type: errorType(exception) };
    if (typeof response === 'string') {
      result.message = response;
    } else if (response instanceof Error) {
      // The text of an Error is internal: the customer gets the default message.
      result.cause = response;
    } else if (list) {
      result.details = { validation: list };
    } else if (
      typeof (response as { message?: unknown })?.message === 'string'
    ) {
      result.message = (response as { message: string }).message;
    }
    if (result.message) result.message = removeRouteQuery(result.message);
    return result;
  },
};

const timeoutErrorHandler: ErrorHandler = {
  canHandle: (error) => error instanceof Error && error.name === 'TimeoutError',
  handle: (error) => ({
    code: 'TIMEOUT',
    type: (error as Error).name,
    message: (error as Error).message,
  }),
};

const errorHandler: ErrorHandler = {
  canHandle: (error) => error instanceof Error,
  handle: (error) => ({
    code: 'INTERNAL_SERVER_ERROR',
    type: errorType(error as Error),
    message: (error as Error).message,
  }),
};

const otherValueHandler: ErrorHandler = {
  canHandle: () => true,
  handle: (error) => ({
    code: 'INTERNAL_SERVER_ERROR',
    type: 'UnknownError',
    message: String(error),
  }),
};

/** The handlers in order. The first handler that says yes wins. */
export const backErrorHandlers: readonly ErrorHandler[] = [
  customExceptionHandler,
  httpExceptionHandler,
  timeoutErrorHandler,
  errorHandler,
  otherValueHandler,
];
