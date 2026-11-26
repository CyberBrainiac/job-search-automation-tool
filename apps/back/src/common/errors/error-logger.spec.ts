import { Logger } from '@nestjs/common';
import type { AppError } from '@repo/shared';
import { logError } from './error-logger.js';

// Unit tests of change 261124-0853. Names come from
// openspec/changes/261124-0853-global-error-handler/specs/error-handling/spec.md.

const STACK_3_LINES =
  'TypeError: Example failure\n    at first (a.ts:1:1)\n    at second (b.ts:2:2)';

/** An AppError with test values. `overrides` changes some fields. */
function appError(overrides: Partial<AppError> = {}): AppError {
  return {
    code: 'INTERNAL_SERVER_ERROR',
    status: 500,
    message: 'Example failure',
    retryable: false,
    source: 'http',
    type: 'TypeError',
    timestamp: '2026-11-26T08:00:00.000Z',
    location: '/example',
    ...overrides,
  };
}

const originalNodeEnv = process.env.NODE_ENV;
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let consoleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  vi.restoreAllMocks();
});

/** The first argument of each call of a spy. */
function texts(spy: { mock: { calls: unknown[][] } }): string[] {
  return spy.mock.calls.map((call) => String(call[0]));
}

describe('Level of the error log', () => {
  it('Log of a server error', () => {
    logError(appError());

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [text] = texts(errorSpy);
    for (const part of [
      '500',
      'INTERNAL_SERVER_ERROR',
      'http',
      '/example',
      'Example failure',
    ]) {
      expect(text).toContain(part);
    }
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('Log of a client error', () => {
    logError(
      appError({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
        message: 'Vacancy 42 not found',
        type: 'CustomException',
      }),
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [text] = texts(warnSpy);
    for (const part of [
      '404',
      'RESOURCE_NOT_FOUND',
      '/example',
      'Vacancy 42 not found',
    ]) {
      expect(text).toContain(part);
    }
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('Log of a client error outside a request', () => {
    logError(
      appError({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
        source: 'job',
        location: 'fetch-vacancies',
      }),
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('Log of a wrapper error', () => {
    logError(
      appError({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
        type: 'SuppressedError',
        inner: [
          appError({ code: 'RESOURCE_NOT_FOUND', status: 404 }),
          appError({ code: 'INTERNAL_SERVER_ERROR', status: 500 }),
        ],
      }),
    );

    expect(errorSpy).toHaveBeenCalledTimes(3);
    const [first, second, third] = texts(errorSpy);
    expect(first).toContain('inner=2');
    expect(second).toContain('inner 1/2');
    expect(third).toContain('inner 2/2');
  });
});

describe('One line for one error', () => {
  it('Line break in a message (SEC-03.10)', () => {
    logError(
      appError({
        code: 'RESOURCE_NOT_FOUND',
        status: 404,
        message: 'Vacancy 42\nERROR 500 FAKE',
      }),
    );

    const [text] = texts(warnSpy);
    expect(text).not.toMatch(/[\r\n]/);
    expect(text).toContain('Vacancy 42\\nERROR 500 FAKE');
  });

  it('Stack in the log line', () => {
    logError(appError({ stack: STACK_3_LINES }));

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const call = errorSpy.mock.calls[0] ?? [];
    expect(call).toHaveLength(1);
    const text = String(call[0]);
    expect(text).toContain('type=TypeError');
    expect(text).toContain('stack=');
    expect(text).not.toMatch(/[\r\n]/);
  });

  it('Cause in the log line', () => {
    logError(
      appError({
        code: 'EXTERNAL_API_ERROR',
        status: 502,
        cause: { type: 'Error', message: 'connect ECONNREFUSED 10.0.0.5:443' },
      }),
    );

    const [text] = texts(errorSpy);
    expect(text).toContain('cause="Error: connect ECONNREFUSED 10.0.0.5:443"');
  });

  it('Readable stack in development', () => {
    process.env.NODE_ENV = 'development';

    logError(appError({ stack: STACK_3_LINES }));

    expect(errorSpy.mock.calls[0]?.[1]).toBe(STACK_3_LINES);
  });
});

describe('Safe logger', () => {
  it('Logger that fails', () => {
    errorSpy.mockImplementation(() => {
      throw new Error('stdout closed');
    });

    expect(() => logError(appError())).not.toThrow();
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const [text] = texts(consoleSpy);
    expect(text).toContain('500');
    expect(text).toContain('INTERNAL_SERVER_ERROR');
  });
});
