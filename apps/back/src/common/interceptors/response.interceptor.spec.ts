import { NotFoundException, StreamableFile } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor.js';

// Unit tests of change 261126-1155. Names come from
// openspec/changes/261126-1155-success-response/specs/api-response/spec.md.

const interceptor = new ResponseInterceptor();

/** A mock context. The status of the mock response is `statusCode`. */
function context(type = 'http', statusCode = 200): ExecutionContext {
  return {
    getType: () => type,
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  } as unknown as ExecutionContext;
}

/** A CallHandler that gives the result of the handler. */
function handlerOf(value: unknown): CallHandler {
  return { handle: () => of(value) };
}

/** Runs the interceptor and gives its last value. */
function run(ctx: ExecutionContext, next: CallHandler): Promise<unknown> {
  return lastValueFrom(interceptor.intercept(ctx, next));
}

describe('Success response body', () => {
  it('Object result', async () => {
    const result = await run(
      context(),
      handlerOf({ id: 42, title: 'Backend developer' }),
    );

    expect(result).toStrictEqual({
      success: true,
      data: { id: 42, title: 'Backend developer' },
      statusCode: 200,
    });
  });

  it('No result', async () => {
    const result = await run(context(), handlerOf(undefined));

    expect(result).toStrictEqual({
      success: true,
      data: null,
      statusCode: 200,
    });
  });

  it('Status of the response', async () => {
    const result = await run(context('http', 201), handlerOf({ id: 42 }));

    expect(result).toMatchObject({ statusCode: 201 });
  });
});

describe('Results that keep their shape', () => {
  it('File result', async () => {
    const file = new StreamableFile(Buffer.from('id,title'));

    const result = await run(context(), handlerOf(file));

    expect(result).toBe(file);
  });

  it('Value of a context that is not HTTP', async () => {
    const message = { event: 'vacancy', data: 42 };

    const result = await run(context('ws'), handlerOf(message));

    expect(result).toBe(message);
  });

  it('Exception of the handler', async () => {
    const exception = new NotFoundException('Example 42 not found');
    const next: CallHandler = { handle: () => throwError(() => exception) };

    await expect(run(context(), next)).rejects.toBe(exception);
  });
});
