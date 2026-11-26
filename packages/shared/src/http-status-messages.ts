/**
 * The default text of an HTTP error status (openspec change 261124-0853, EH2).
 * The front app shows it for a response with no error code.
 */
export const HTTP_STATUS_MESSAGES: Readonly<Partial<Record<number, string>>> = {
  400: 'The request is not valid.',
  401: 'Sign in to continue.',
  403: 'You do not have access.',
  404: 'Not found.',
  408: 'The request took too long.',
  409: 'The request conflicts with the current data.',
  413: 'The request is too large.',
  422: 'The request data is not valid.',
  429: 'Too many requests. Try again later.',
  500: 'Sorry, something bad happened. Try again.',
  502: 'An external service failed. Try again later.',
  503: 'The service is not available. Try again later.',
  504: 'The request took too long. Try again later.',
};
