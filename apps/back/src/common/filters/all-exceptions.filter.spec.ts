import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { ErrorCodes } from '@repo/shared';
import type { AppError, ErrorResponse } from '@repo/shared';
import { CustomException } from '../errors/custom.exception.js';
import { backErrorHandlers } from '../errors/error-handlers.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

// Unit tests of change 261126-1154. Names come from
// openspec/changes/261126-1154-http-error-response/specs/error-handling/spec.md.

interface MockResponse {
  headersSent: boolean;
  writableEnded: boolean;
  destroy: ReturnType<typeof vi.fn>;
}

const originalNodeEnv = process.env.NODE_ENV;
let reply: ReturnType<typeof vi.fn>;
let logSpy: ReturnType<typeof vi.fn<(error: AppError) => void>>;
let response: MockResponse;
let filter: AllExceptionsFilter;

/** A mock ArgumentsHost with the request `GET /example?page=2`. */
function host(type = 'http'): ArgumentsHost {
  const request = { method: 'GET', originalUrl: '/example?page=2' };
  return {
    getType: () => type,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
}

/** The body and the status of the one call of `httpAdapter.reply`. */
function replied(): { body: ErrorResponse; status: number } {
  expect(reply).toHaveBeenCalledTimes(1);
  const [target, body, status] = reply.mock.calls[0] as [
    unknown,
    ErrorResponse,
    number,
  ];
  expect(target).toBe(response);
  return { body, status };
}

/** The AppError of the one call of the logger. */
function logged(): AppError {
  expect(logSpy).toHaveBeenCalledTimes(1);
  return logSpy.mock.calls[0]?.[0] as AppError;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-26T08:00:00.000Z'));
  process.env.NODE_ENV = 'production';
  reply = vi.fn();
  logSpy = vi.fn<(error: AppError) => void>();
  response = { headersSent: false, writableEnded: false, destroy: vi.fn() };
  const httpAdapterHost = {
    httpAdapter: { reply },
  } as unknown as HttpAdapterHost;
  filter = new AllExceptionsFilter(httpAdapterHost, backErrorHandlers, logSpy);
});

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Error response body', () => {
  it('Body of a business error', () => {
    filter.catch(
      new CustomException(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Example 42 not found',
      ),
      host(),
    );

    const { body, status } = replied();
    expect(status).toBe(404);
    expect(body).toStrictEqual({
      success: false,
      data: null,
      statusCode: 404,
      message: 'Example 42 not found',
      metadata: {
        timestamp: '2026-11-26T08:00:00.000Z',
        path: '/example',
        errorCode: 'RESOURCE_NOT_FOUND',
      },
    });
  });

  it('Body of a validation error', () => {
    filter.catch(
      new BadRequestException(['name must be a string', 'url must be a URL']),
      host(),
    );

    const { body, status } = replied();
    expect(status).toBe(400);
    expect(body.message).toBe('The request data is not valid.');
    expect(body.details).toEqual({
      validation: ['name must be a string', 'url must be a URL'],
    });
    expect(body.metadata.errorCode).toBe('VALIDATION_FAILED');
  });
});

describe('Full body in development', () => {
  it('Unexpected error in development', () => {
    process.env.NODE_ENV = 'development';
    const error = new TypeError('Example failure');

    filter.catch(error, host());

    const { body, status } = replied();
    expect(status).toBe(500);
    expect(body.message).toBe('Example failure');
    expect(body.metadata.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(body.metadata.debug?.exceptionType).toBe('TypeError');
    expect(body.metadata.debug?.stackTrace).toBe(error.stack);
  });

  it('Cause in development', () => {
    process.env.NODE_ENV = 'development';

    filter.catch(
      new CustomException(
        ErrorCodes.EXTERNAL_API_ERROR,
        'The job aggregator failed',
        { cause: new Error('connect ECONNREFUSED 10.0.0.5:443') },
      ),
      host(),
    );

    const { body, status } = replied();
    expect(status).toBe(502);
    expect(body.message).toBe('The job aggregator failed');
    expect(body.metadata.debug?.cause).toMatchObject({
      type: 'Error',
      message: 'connect ECONNREFUSED 10.0.0.5:443',
    });
  });
});

describe('Safe body outside development', () => {
  it('Unexpected error in production', () => {
    filter.catch(
      new TypeError("Cannot read properties of undefined (reading 'id')"),
      host(),
    );

    const { body, status } = replied();
    expect(status).toBe(500);
    expect(body.message).toBe('Sorry, something bad happened. Try again.');
    expect(body.metadata.errorCode).toBe('INTERNAL_SERVER_ERROR');
    expect(body.metadata).not.toHaveProperty('debug');
    expect(JSON.stringify(body)).not.toContain('Cannot read properties');
  });

  it('Business server error in production', () => {
    filter.catch(
      new CustomException(
        ErrorCodes.EXTERNAL_API_ERROR,
        'Aggregator X failed',
        {
          cause: new Error('connect ECONNREFUSED 10.0.0.5:443'),
        },
      ),
      host(),
    );

    const { body, status } = replied();
    expect(status).toBe(502);
    expect(body.message).toBe('An external service failed. Try again later.');
    expect(body.metadata).not.toHaveProperty('debug');
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
  });

  it('Client error in production', () => {
    filter.catch(new NotFoundException('Example 42 not found'), host());

    const { body, status } = replied();
    expect(status).toBe(404);
    expect(body.message).toBe('Example 42 not found');
    expect(body.metadata.errorCode).toBe('NOT_FOUND');
    expect(body.metadata).not.toHaveProperty('debug');
  });

  it('No environment', () => {
    delete process.env.NODE_ENV;

    filter.catch(new TypeError('Example failure'), host());

    const { body } = replied();
    expect(body.message).toBe('Sorry, something bad happened. Try again.');
    expect(body.metadata).not.toHaveProperty('debug');
  });
});

describe('Error log of a request', () => {
  it('Logger gets the error', () => {
    filter.catch(new NotFoundException('Example 42 not found'), host());

    expect(logged()).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      source: 'http',
      location: '/example',
    });
    // The log comes before the reply.
    expect(logSpy.mock.invocationCallOrder[0]).toBeLessThan(
      reply.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('Reply when the logger fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logSpy.mockImplementation(() => {
      throw new Error('disk full');
    });

    expect(() =>
      filter.catch(new NotFoundException('Example 42 not found'), host()),
    ).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(replied().status).toBe(404);
  });
});

describe('Response that has already started', () => {
  it('Error after the full response', () => {
    response.headersSent = true;
    response.writableEnded = true;

    filter.catch(new TypeError('Example failure'), host());

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(reply).not.toHaveBeenCalled();
    expect(response.destroy).not.toHaveBeenCalled();
  });

  it('Error in the middle of the body', () => {
    response.headersSent = true;
    response.writableEnded = false;

    filter.catch(new TypeError('Example failure'), host());

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(reply).not.toHaveBeenCalled();
    expect(response.destroy).toHaveBeenCalledTimes(1);
  });
});

describe('Context that is not HTTP', () => {
  it('Error in a WebSocket context', () => {
    filter.catch(new TypeError('Example failure'), host('ws'));

    expect(logged()).toMatchObject({ source: 'ws' });
    expect(reply).not.toHaveBeenCalled();
  });
});
