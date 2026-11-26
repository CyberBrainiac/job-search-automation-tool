// The injection tokens of the error handling (openspec change 261126-1154, EF2).

/** The list of error handlers that toAppError() uses. */
export const ERROR_HANDLERS = Symbol('ERROR_HANDLERS');

/** The function that writes the log of an AppError. */
export const ERROR_LOGGER = Symbol('ERROR_LOGGER');
