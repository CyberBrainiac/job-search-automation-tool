/** The JSON body that the back app sends with an HTTP error (NestJS default shape). */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
