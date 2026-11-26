import { Injectable, StreamableFile } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { SuccessResponse } from '@repo/shared';
import type { Response } from 'express';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

/**
 * Wraps the result of each HTTP handler in the success response
 * (openspec change 261126-1155, RI3, RI4). An exception goes past map() to the filter.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data: unknown) =>
        // A wrapped file becomes a JSON of the stream object, so a file keeps its shape.
        data instanceof StreamableFile
          ? data
          : ({
              success: true,
              data: data ?? null,
              statusCode: response.statusCode,
            } satisfies SuccessResponse<unknown>),
      ),
    );
  }
}
