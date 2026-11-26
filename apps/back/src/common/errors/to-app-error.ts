import { HttpException } from '@nestjs/common';
import { ERROR_TABLE } from '@repo/shared';
import type { AppError, ErrorCause } from '@repo/shared';
import type { ErrorContext, ErrorHandler } from './error-handler.js';
import {
  backErrorHandlers,
  errorType,
  removeRouteQuery,
} from './error-handlers.js';

// Converts each thrown value to one AppError (openspec change 261124-0853, EH4, EH7, EH8, EH9).

const MAX_DEPTH = 3; // the depth of wrapper errors and the length of the cause chain
const MAX_INNER = 10; // the number of inner errors of a wrapper error

/** The fields that a wrapper error takes from its main inner error. */
type MainFields = Pick<
  AppError,
  'code' | 'status' | 'message' | 'details' | 'retryable'
>;

/**
 * Converts a thrown value to an AppError. It never throws.
 *
 * @example toAppError(new TypeError('x'), { source: 'http', location: '/vacancies' })
 */
export function toAppError(
  error: unknown,
  context: ErrorContext,
  handlers: readonly ErrorHandler[] = backErrorHandlers,
  depth = 0,
): AppError {
  try {
    if (depth < MAX_DEPTH && isSuppressedError(error)) {
      const first = toAppError(error.suppressed, context, handlers, depth + 1);
      const later = toAppError(error.error, context, handlers, depth + 1);
      return fromWrapper(error, first, [first, later], context); // the first error wins
    }
    if (depth < MAX_DEPTH && error instanceof AggregateError) {
      const errors: unknown[] = Array.isArray(error.errors) ? error.errors : [];
      const inner = errors
        .slice(0, MAX_INNER)
        .map((e) => toAppError(e, context, handlers, depth + 1));
      const main = inner.find((e) => e.code !== 'INTERNAL_SERVER_ERROR');
      return fromWrapper(error, main ?? internalError(error), inner, context);
    }
    return runHandlers(error, context, handlers);
  } catch {
    return fallbackAppError(context);
  }
}

/** Node 22 has no global SuppressedError, so `instanceof` throws ReferenceError. */
function isSuppressedError(
  error: unknown,
): error is Error & { error: unknown; suppressed: unknown } {
  return (
    error instanceof Error &&
    error.name === 'SuppressedError' &&
    'suppressed' in error &&
    'error' in error
  );
}

/** Asks the handlers in order. ERROR_TABLE gives the status, the retry flag and the default message. */
function runHandlers(
  error: unknown,
  context: ErrorContext,
  handlers: readonly ErrorHandler[],
): AppError {
  const handler = handlers.find((h) => h.canHandle(error));
  if (!handler) return fallbackAppError(context);
  const handled = handler.handle(error);
  const definition = ERROR_TABLE[handled.code];

  let stack: string | undefined;
  let cause: unknown = handled.cause;
  if (error instanceof Error) {
    // The stack of an HttpException starts with its message, so it can have the query of a route.
    stack =
      error instanceof HttpException && error.stack
        ? removeRouteQuery(error.stack)
        : error.stack;
    cause ??= error.cause;
  }

  return {
    code: handled.code,
    status: handled.status ?? definition.status,
    message: handled.message || definition.message,
    details: handled.details,
    retryable: definition.retryable,
    source: context.source,
    type: handled.type,
    timestamp: new Date().toISOString(),
    location: context.location,
    stack,
    cause: toErrorCause(cause),
  };
}

/** Takes the main fields from `main`, and `type`, `stack` and `cause` from the wrapper. */
function fromWrapper(
  error: Error,
  main: MainFields,
  inner: AppError[],
  context: ErrorContext,
): AppError {
  return {
    code: main.code,
    status: main.status,
    message: main.message,
    details: main.details,
    retryable: main.retryable,
    source: context.source,
    type: error.name,
    timestamp: new Date().toISOString(),
    location: context.location,
    stack: error.stack,
    cause: toErrorCause(error.cause),
    inner,
  };
}

/** The main fields of a wrapper error with no known inner code. */
function internalError(error: Error): MainFields {
  const definition = ERROR_TABLE.INTERNAL_SERVER_ERROR;
  return {
    code: 'INTERNAL_SERVER_ERROR',
    status: definition.status,
    message: error.message || definition.message,
    retryable: definition.retryable,
  };
}

/** The cause chain. It stops after MAX_DEPTH errors, also when an error is its own cause. */
function toErrorCause(value: unknown, depth = 1): ErrorCause | undefined {
  if (value === undefined || value === null || depth > MAX_DEPTH) {
    return undefined;
  }
  if (value instanceof Error) {
    return {
      type: errorType(value),
      message: value.message,
      stack: value.stack,
      cause: toErrorCause(value.cause, depth + 1),
    };
  }
  return { type: 'UnknownError', message: safeText(value) };
}

/** String() throws for a value such as Object.create(null). */
function safeText(value: unknown): string {
  try {
    return String(value);
  } catch {
    return '';
  }
}

/** The AppError when the conversion fails. */
function fallbackAppError(context: ErrorContext): AppError {
  const definition = ERROR_TABLE.INTERNAL_SERVER_ERROR;
  return {
    code: 'INTERNAL_SERVER_ERROR',
    status: definition.status,
    message: definition.message,
    retryable: definition.retryable,
    source: context.source,
    type: 'UnknownError',
    timestamp: new Date().toISOString(),
    location: context.location,
  };
}
