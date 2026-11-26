import { Catch, Inject } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ERROR_TABLE } from '@repo/shared';
import type { AppError, ErrorResponse, ErrorSource } from '@repo/shared';
import type { Request, Response } from 'express';
import { isDevelopment } from '../environment.js';
import type { ErrorHandler } from '../errors/error-handler.js';
import type { ErrorLogger } from '../errors/error-logger.js';
import { ERROR_HANDLERS, ERROR_LOGGER } from '../errors/error.tokens.js';
import { toAppError } from '../errors/to-app-error.js';
import { toErrorResponse } from '../errors/to-error-response.js';

// The one filter of all exceptions (openspec change 261126-1154, EF1, EF4–EF8, EF10).

/** The source of a context that is not HTTP. */
function sourceOf(type: string): ErrorSource {
  return type === 'ws' || type === 'rpc' || type === 'graphql' ? type : 'other';
}

/** The path without the query string: '/a?token=1' -> '/a'. */
function pathOf(request: Request): string {
  return (request.originalUrl ?? request.url ?? '').split('?')[0] ?? '';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(ERROR_HANDLERS) private readonly handlers: readonly ErrorHandler[],
    @Inject(ERROR_LOGGER) private readonly logError: ErrorLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const type = host.getType<string>();

    if (type !== 'http') {
      // No reply for now: the change that adds the context adds it (EF10).
      this.safeLog(
        toAppError(exception, { source: sourceOf(type) }, this.handlers),
      );
      return;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const path = pathOf(request);
    const appError = toAppError(
      exception,
      { source: 'http', location: path },
      this.handlers,
    );
    this.safeLog(appError);

    if (response.headersSent) {
      // A JSON error in a started body breaks it. Close a half-sent body (EF6).
      if (!response.writableEnded) response.destroy();
      return;
    }

    const body = toErrorResponse(appError, path);
    if (!isDevelopment()) makeSafe(body, appError);
    this.httpAdapterHost.httpAdapter.reply(response, body, appError.status);
  }

  /** A bug in the logger must not leave the client with no reply (EF7). */
  private safeLog(appError: AppError): void {
    try {
      this.logError(appError);
    } catch {
      console.error(
        `${appError.status} ${appError.code} (the error logger failed)`,
      );
    }
  }
}

/** Outside development: no debug fields, and the default message for a 5xx status (EF5). */
function makeSafe(body: ErrorResponse, appError: AppError): void {
  delete body.metadata.debug;
  if (appError.status >= 500) body.message = ERROR_TABLE[appError.code].message;
}
