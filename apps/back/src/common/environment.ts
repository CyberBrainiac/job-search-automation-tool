/**
 * True when the back app runs with NODE_ENV=development (openspec change 261124-0853, EH11).
 * It reads the variable at each call, so the tests can change it.
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}
