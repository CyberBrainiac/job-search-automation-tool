import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  handleStartupError,
  registerProcessErrorHandlers,
} from './common/errors/process-error-handlers.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`Back is running on http://localhost:${port}`, 'Bootstrap');
}

// The errors outside a request (openspec change 261126-1156, EO1).
registerProcessErrorHandlers();
await bootstrap().catch((error: unknown) => handleStartupError(error));
