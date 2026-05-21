import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Additional helper methods for structured logging
  logWithMetadata(
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
    metadata: Record<string, any>,
  ) {
    this.logger.log(level, message, metadata);
  }

  logUserAction(userId: string, action: string, details?: Record<string, any>) {
    this.logger.info('User action', {
      context: 'UserAction',
      userId,
      action,
      ...details,
    });
  }

  logApiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
  ) {
    this.logger.info('API Request', {
      context: 'ApiRequest',
      method,
      path,
      statusCode,
      duration,
    });
  }

  logDatabaseQuery(
    operation: string,
    model: string,
    duration: number,
    success: boolean,
  ) {
    this.logger.info('Database query', {
      context: 'DatabaseQuery',
      operation,
      model,
      duration,
      success,
    });
  }
}
