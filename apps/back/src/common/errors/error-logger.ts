import { Logger } from '@nestjs/common';
import type { AppError } from '@repo/shared';
import { isDevelopment } from '../environment.js';

// The one logger of the errors (openspec change 261124-0853, EH10).

export type ErrorLogger = (error: AppError) => void;

const logger = new Logger('AppError');

/** True: the level is `error`. False: the level is `warn`. */
function isErrorLevel(error: AppError): boolean {
  return (
    error.status >= 500 ||
    (error.inner ?? []).some((e) => e.status >= 500) ||
    error.source !== 'http'
  );
}

/** Changes each line break to the 2 characters `\n`, so a user value cannot make a fake log line. */
function oneLine(text: string): string {
  return text.replace(/[\r\n]/g, '\\n');
}

/** The first line, then one line for each inner error. */
function formatLines(
  error: AppError,
  errorLevel: boolean,
  development: boolean,
): string[] {
  const inner = error.inner ?? [];
  let first = `${error.status} ${error.code} ${error.source} ${error.location ?? '-'} "${error.message}"`;
  if (inner.length > 0) first += ` inner=${inner.length}`;
  if (errorLevel) {
    first += ` type=${error.type}`;
    // In development, the stack goes to Logger.error() as the second argument.
    if (error.stack && !development) first += ` stack="${error.stack}"`;
    if (error.cause) {
      first += ` cause="${error.cause.type}: ${error.cause.message}"`;
    }
  }
  const lines = [
    first,
    ...inner.map(
      (e, i) =>
        `inner ${i + 1}/${inner.length}: ${e.status} ${e.code} ${e.type} "${e.message}"`,
    ),
  ];
  return development ? lines : lines.map(oneLine);
}

/** Writes the log lines of an AppError. It never throws. */
export const logError: ErrorLogger = (error) => {
  let lines: string[] = [];
  try {
    const development = isDevelopment();
    const errorLevel = isErrorLevel(error);
    lines = formatLines(error, errorLevel, development);
    lines.forEach((line, i) => {
      if (!errorLevel) logger.warn(line);
      else if (i === 0 && development && error.stack) {
        logger.error(line, error.stack);
      } else logger.error(line);
    });
  } catch {
    writeToConsole(lines, error);
  }
};

/** The last way to write the error when the NestJS Logger fails. */
function writeToConsole(lines: string[], error: AppError): void {
  try {
    console.error(
      lines.length > 0 ? lines.join('\n') : `${error.status} ${error.code}`,
    );
  } catch {
    // Nothing more can write the error.
  }
}
