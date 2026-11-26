import { HttpException } from '@nestjs/common';
import { ERROR_TABLE } from '@repo/shared';
import type { ErrorCode, ErrorDetails } from '@repo/shared';

/**
 * A business error: the code throws it on purpose (openspec change 261124-0853, EH3).
 * The status comes from ERROR_TABLE, so a code has the same status everywhere.
 *
 * @example throw new CustomException(ErrorCodes.RESOURCE_NOT_FOUND, 'Vacancy 42 not found');
 */
export class CustomException extends HttpException {
  readonly details?: ErrorDetails;

  constructor(
    readonly code: ErrorCode,
    message?: string,
    options: { details?: ErrorDetails; cause?: unknown } = {},
  ) {
    const definition = ERROR_TABLE[code];
    super(message || definition.message, definition.status, {
      cause: options.cause,
      errorCode: code,
    });
    this.details = options.details;
  }
}
