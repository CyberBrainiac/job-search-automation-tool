import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCodes } from '@repo/shared';
import { CustomException } from './custom.exception.js';
import type { ErrorContext, ErrorHandler } from './error-handler.js';
import { backErrorHandlers } from './error-handlers.js';
import { toAppError } from './to-app-error.js';

// Unit tests of change 261124-0853. Names come from
// openspec/changes/261124-0853-global-error-handler/specs/error-handling/spec.md.

const context: ErrorContext = { source: 'http', location: '/example' };

/** Node 22 has no SuppressedError, so the tests make one by hand. */
function suppressedError(suppressed: unknown, error: unknown): Error {
  return Object.assign(new Error('An error was suppressed during disposal.'), {
    name: 'SuppressedError',
    suppressed,
    error,
  });
}

/** An Error with a chain of `length` causes: 'cause 1', 'cause 2', ... */
function errorWithCauses(length: number): Error {
  let cause: Error | undefined;
  for (let i = length; i >= 1; i--) {
    cause = new Error(`cause ${i}`, { cause });
  }
  return new Error('top error', { cause });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-26T08:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Business error', () => {
  it('Business error with a message', () => {
    const exception = new CustomException(
      ErrorCodes.RESOURCE_NOT_FOUND,
      'Vacancy 42 not found',
    );

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      status: 404,
      retryable: false,
      message: 'Vacancy 42 not found',
      type: 'CustomException',
      source: 'http',
      location: '/example',
      timestamp: '2026-11-26T08:00:00.000Z',
    });
  });

  it('Business error with no message', () => {
    const exception = new CustomException(ErrorCodes.RESOURCE_NOT_FOUND);

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      status: 404,
      message: 'The item was not found.',
    });
  });

  it('Business error with details', () => {
    const exception = new CustomException(
      ErrorCodes.VALIDATION_FAILED,
      'The vacancy filter is not valid',
      { details: { validation: ['salary must be a number'] } },
    );

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      status: 400,
      message: 'The vacancy filter is not valid',
      details: { validation: ['salary must be a number'] },
    });
  });
});

describe('Code of an HTTP exception', () => {
  it('HTTP exception with a status in the table', () => {
    const result = toAppError(new ForbiddenException(), context);

    expect(result).toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
      message: 'Forbidden',
      type: 'ForbiddenException',
    });
  });

  it('HTTP exception with a status not in the table', () => {
    const result = toAppError(new PayloadTooLargeException(), context);

    expect(result).toMatchObject({ code: 'BAD_REQUEST', status: 413 });
  });

  it('HTTP exception with a known error code', () => {
    const exception = new NotFoundException('Vacancy 42 not found', {
      errorCode: 'RESOURCE_NOT_FOUND',
    });

    const result = toAppError(exception, context);

    expect(result).toMatchObject({ code: 'RESOURCE_NOT_FOUND', status: 404 });
  });

  it('HTTP exception with an unknown error code', () => {
    const exception = new NotFoundException('Vacancy 42 not found', {
      errorCode: 'NO_SUCH_CODE',
    });

    const result = toAppError(exception, context);

    expect(result).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('HTTP exception with a status out of range', () => {
    const result = toAppError(new HttpException('Moved', 302), context);

    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
    });
  });
});

describe('Message of an HTTP exception', () => {
  it('HTTP exception that holds an error', () => {
    const exception = new UnauthorizedException(new Error('jwt malformed'));

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Sign in to continue.',
    });
    expect(result.cause).toMatchObject({
      type: 'Error',
      message: 'jwt malformed',
    });
  });

  it('Unknown route message with a query', () => {
    const exception = new NotFoundException('Cannot GET /vacancies?token=abc');

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Cannot GET /vacancies',
    });
    expect(JSON.stringify(result)).not.toContain('token=abc');
  });
});

describe('Validation messages', () => {
  it('List of validation messages', () => {
    const exception = new BadRequestException([
      'name must be a string',
      'url must be a URL',
    ]);

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      code: 'VALIDATION_FAILED',
      status: 400,
      message: 'The request data is not valid.',
    });
    expect(result.details).toEqual({
      validation: ['name must be a string', 'url must be a URL'],
    });
  });

  it('List of messages with another status', () => {
    const exception = new ConflictException(['name is already used']);

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      code: 'RESOURCE_ALREADY_EXISTS',
      status: 409,
      message: 'The item already exists.',
    });
    expect(result.details).toEqual({ validation: ['name is already used'] });
  });
});

describe('Unexpected error', () => {
  it('Unexpected error with the real message', () => {
    const error = new TypeError(
      "Cannot read properties of undefined (reading 'id')",
    );

    const result = toAppError(error, context);

    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      retryable: false,
      message: "Cannot read properties of undefined (reading 'id')",
      type: 'TypeError',
      stack: error.stack,
    });
  });

  it('Thrown value that is not an error', () => {
    const result = toAppError('boom', context);

    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'boom',
      type: 'UnknownError',
    });
    expect(result.stack).toBeUndefined();
  });

  it('Error outside a request', () => {
    const result = toAppError(new TypeError('Example failure'), {
      source: 'job',
      location: 'fetch-vacancies',
    });

    expect(result).toMatchObject({
      source: 'job',
      location: 'fetch-vacancies',
    });
  });
});

describe('Timeout error', () => {
  it('Timeout of an operation', () => {
    const error = new DOMException(
      'The operation was aborted due to timeout',
      'TimeoutError',
    );

    const result = toAppError(error, context);

    expect(result).toMatchObject({
      code: 'TIMEOUT',
      status: 504,
      retryable: true,
      type: 'TimeoutError',
    });
  });
});

describe('Cause of an error', () => {
  it('Error with a cause', () => {
    const cause = new Error('connect ECONNREFUSED 10.0.0.5:443');
    const exception = new CustomException(
      ErrorCodes.EXTERNAL_API_ERROR,
      'The job aggregator failed',
      { cause },
    );

    const result = toAppError(exception, context);

    expect(result).toMatchObject({
      code: 'EXTERNAL_API_ERROR',
      status: 502,
      retryable: true,
      message: 'The job aggregator failed',
    });
    expect(result.cause).toMatchObject({
      type: 'Error',
      message: 'connect ECONNREFUSED 10.0.0.5:443',
      stack: cause.stack,
    });
  });

  it('Long chain of causes', () => {
    const result = toAppError(errorWithCauses(5), context);

    expect(result.cause?.message).toBe('cause 1');
    expect(result.cause?.cause?.message).toBe('cause 2');
    expect(result.cause?.cause?.cause?.message).toBe('cause 3');
    expect(result.cause?.cause?.cause?.cause).toBeUndefined();
  });

  it('Error that is its own cause', () => {
    const error = new Error('loop');
    error.cause = error;

    const result = toAppError(error, context);

    expect(result.cause?.cause?.cause).toBeDefined();
    expect(result.cause?.cause?.cause?.cause).toBeUndefined();
  });
});

describe('Suppressed error', () => {
  it('Cleanup error after a business error', () => {
    const error = suppressedError(
      new CustomException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Vacancy 42 not found',
      ),
      new TypeError('close failed'),
    );

    const result = toAppError(error, context);

    expect(result).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      status: 404,
      message: 'Vacancy 42 not found',
      type: 'SuppressedError',
    });
    expect(result.inner).toHaveLength(2);
    expect(result.inner?.[0]?.code).toBe('RESOURCE_NOT_FOUND');
    expect(result.inner?.[1]?.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('Business error in the cleanup after an unexpected error', () => {
    const error = suppressedError(
      new TypeError('read failed'),
      new CustomException(ErrorCodes.RESOURCE_NOT_FOUND),
    );

    const result = toAppError(error, context);

    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'read failed',
    });
  });
});

describe('Aggregate error', () => {
  it('Aggregate error with a known inner code', () => {
    const error = new AggregateError(
      [
        new TypeError('Aggregator A failed'),
        new CustomException(
          ErrorCodes.EXTERNAL_API_ERROR,
          'Aggregator B failed',
        ),
      ],
      'All aggregators failed',
    );

    const result = toAppError(error, context);

    expect(result).toMatchObject({
      code: 'EXTERNAL_API_ERROR',
      status: 502,
      message: 'Aggregator B failed',
      type: 'AggregateError',
    });
    expect(result.inner).toHaveLength(2);
  });

  it('Aggregate error with only unexpected errors', () => {
    const error = new AggregateError(
      [
        new TypeError('Aggregator A failed'),
        new RangeError('Aggregator B failed'),
      ],
      'All aggregators failed',
    );

    const result = toAppError(error, context);

    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      message: 'All aggregators failed',
    });
  });

  it('Aggregate error with many inner errors', () => {
    const errors = Array.from(
      { length: 15 },
      (_, i) => new TypeError(`Aggregator ${i} failed`),
    );

    const result = toAppError(new AggregateError(errors), context);

    expect(result.inner).toHaveLength(10);
  });
});

describe('Safe conversion', () => {
  it('Thrown value with no text', () => {
    let result: ReturnType<typeof toAppError> | undefined;

    expect(() => {
      result = toAppError(Object.create(null), context);
    }).not.toThrow();
    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      type: 'UnknownError',
    });
  });

  it('Handler that fails', () => {
    const brokenHandler: ErrorHandler = {
      canHandle: () => {
        throw new Error('handler bug');
      },
      handle: () => ({ code: 'BAD_REQUEST', type: 'Broken' }),
    };
    const handlers = [brokenHandler, ...backErrorHandlers];
    let result: ReturnType<typeof toAppError> | undefined;

    expect(() => {
      result = toAppError(new NotFoundException(), context, handlers);
    }).not.toThrow();
    expect(result).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      status: 500,
      type: 'UnknownError',
    });
  });
});
