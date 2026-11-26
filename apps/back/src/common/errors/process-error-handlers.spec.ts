import { EventEmitter } from 'node:events';
import type { AppError } from '@repo/shared';
import {
  handleStartupError,
  registerProcessErrorHandlers,
} from './process-error-handlers.js';

// Unit tests of change 261126-1156. Names come from
// openspec/changes/261126-1156-errors-outside-requests/specs/error-handling/spec.md.

let target: EventEmitter;
let log: ReturnType<typeof vi.fn<(error: AppError) => void>>;
let exit: ReturnType<typeof vi.fn<(code?: number) => never>>;

beforeEach(() => {
  target = new EventEmitter();
  log = vi.fn<(error: AppError) => void>();
  exit = vi.fn<(code?: number) => never>();
});

/** True when the first call of `first` comes before the first call of `second`. */
function calledBefore(
  first: { mock: { invocationCallOrder: number[] } },
  second: { mock: { invocationCallOrder: number[] } },
): boolean {
  return (
    (first.mock.invocationCallOrder[0] ?? Infinity) <
    (second.mock.invocationCallOrder[0] ?? -Infinity)
  );
}

describe('Promise rejection that no code catches', () => {
  it('Rejected promise with no catch', () => {
    registerProcessErrorHandlers(target, log, exit);

    target.emit('unhandledRejection', new TypeError('Example failure'));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      source: 'process',
      location: 'unhandledRejection',
      message: 'Example failure',
    });
    expect(exit).not.toHaveBeenCalled();
  });
});

describe('Uncaught exception', () => {
  it('Exception that nothing catches', () => {
    registerProcessErrorHandlers(target, log, exit);

    target.emit('uncaughtException', new RangeError('Example failure'));

    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0]?.[0]).toMatchObject({
      source: 'process',
      location: 'uncaughtException',
    });
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(calledBefore(log, exit)).toBe(true);
  });
});

describe('Startup error', () => {
  it('Port already in use', () => {
    handleStartupError(
      new Error('listen EADDRINUSE: address already in use :::3000'),
      log,
      exit,
    );

    expect(log).toHaveBeenCalledTimes(1);
    const appError = log.mock.calls[0]?.[0];
    expect(appError?.source).toBe('startup');
    expect(appError?.message).toContain('EADDRINUSE');
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(calledBefore(log, exit)).toBe(true);
  });
});
