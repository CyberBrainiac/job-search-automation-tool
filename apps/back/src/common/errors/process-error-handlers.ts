import type { ErrorLogger } from './error-logger.js';
import { logError } from './error-logger.js';
import { toAppError } from './to-app-error.js';

// The log of the errors outside a request (openspec change 261126-1156, EO1–EO3).

/** What the handlers need from `process`. A unit test gives an EventEmitter. */
type ProcessEvents = Pick<NodeJS.EventEmitter, 'on'>;
type Exit = (code: number) => void;

const exitProcess: Exit = (code) => process.exit(code);

/**
 * Logs a promise rejection that no code catches, and the app keeps running (EO2).
 * Logs an exception that no code catches, then stops the app with the code 1 (EO3).
 */
export function registerProcessErrorHandlers(
  target: ProcessEvents = process,
  log: ErrorLogger = logError,
  exit: Exit = exitProcess,
): void {
  target.on('unhandledRejection', (reason: unknown) => {
    log(
      toAppError(reason, { source: 'process', location: 'unhandledRejection' }),
    );
  });
  target.on('uncaughtException', (error: unknown) => {
    log(
      toAppError(error, { source: 'process', location: 'uncaughtException' }),
    );
    exit(1);
  });
}

/** Logs an error of bootstrap(), then stops the app with the code 1 (EO3). */
export function handleStartupError(
  error: unknown,
  log: ErrorLogger = logError,
  exit: Exit = exitProcess,
): void {
  log(toAppError(error, { source: 'startup' }));
  exit(1);
}
