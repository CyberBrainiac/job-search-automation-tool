## HTTP exception filter
Context: error-handling.md

1. Think about architecture of handling exceptions, can I process runtime Errors in separate way from HTTPExceptions?
How can I split errors, process each with its own way and then merge processed errors in one shape called ErrorResponse for all clients?
I think good architecture will be custom handlers for errors with different shapes (Telegram error, gRPC exception, axios exception etc). 
I need to write custom handler for each new Error type and provide handlers in to exception filter for building custom described, serializable object error.
If I create handlers I can use it to create AppError (not declared, but must be reusable on frontend and backend and provides standart error shape for different errors) which I'll use inside application for runtime fixing, retries etc... These handlers gives me standart properties to operate in code.

2. I need Record with all errors and codes. I can store it in shared constants.
const STATUS_BY_CODE: Record<ErrorCode, HttpStatus> = {
RESOURCE_NOT_FOUND: HttpStatus.NOT_FOUND,
EXTERNAL_API_ERROR: HttpStatus.BAD_GATEWAY,
// ...
};

3. remove 'exceptionName' as this field near always has the same value as 'exceptionType' except rarely case (AbortError/TimeoutError distinction).

4. Does the response have an errorCode? No. Now response haven't metadata.errorCode. I can map statusCode with Error Codes table.
There will be ErrorCode for any type of ErrorResponse interface.

5. status is 500 or more? Then Logger runs. I want change this part of algorithm, I want exception filter only process errors, logging part is separate task, so I need separate handler for logging
Provide function for logging in to Exception constructor for quick changing logging shape.
For example, I can provide `console.log`, this function log application errors. 
On top of that, I can provide more advanced logger which decide error level, choose which error logging shape.

6. NODE_ENV is development? I want move to the end before httpAdapter.reply(response, body, status). In the filter the metadata.stackTrace adds to each error.
"is development" condition clear metadata.stackTrace from responses during production.