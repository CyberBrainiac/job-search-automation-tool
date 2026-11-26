import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { backErrorHandlers } from './common/errors/error-handlers.js';
import { logError } from './common/errors/error-logger.js';
import { ERROR_HANDLERS, ERROR_LOGGER } from './common/errors/error.tokens.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    // The global exception filter (openspec change 261126-1154, EF2).
    { provide: ERROR_HANDLERS, useValue: backErrorHandlers },
    { provide: ERROR_LOGGER, useValue: logError },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
