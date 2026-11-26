import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { backErrorHandlers } from './common/errors/error-handlers.js';
import { logError } from './common/errors/error-logger.js';
import { ERROR_HANDLERS, ERROR_LOGGER } from './common/errors/error.tokens.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [
    AppService,
    // The global exception filter (openspec change 261126-1154, EF2).
    { provide: ERROR_HANDLERS, useValue: backErrorHandlers },
    { provide: ERROR_LOGGER, useValue: logError },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // The global response interceptor (openspec change 261126-1155, RI1).
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
