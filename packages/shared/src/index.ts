// Public entry of @repo/shared. Export every shared file from here.
// Relative imports need the .js extension (nodenext).
export type {
  BaseResponse,
  ErrorDebug,
  ErrorMetadata,
  ErrorResponse,
} from './api-response.js';
export type {
  AppError,
  ErrorCause,
  ErrorDetails,
  ErrorSource,
} from './app-error.js';
export {
  CODE_BY_STATUS,
  ERROR_TABLE,
  ErrorCodes,
  isErrorCode,
} from './error-codes.js';
export type { ErrorCode, ErrorDefinition } from './error-codes.js';
export { HTTP_STATUS_MESSAGES } from './http-status-messages.js';
