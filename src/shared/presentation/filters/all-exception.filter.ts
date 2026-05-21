import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Ignore favicon requests - this is normal browser behavior
    if (request.url === '/favicon.ico') {
      response.status(204).end();
      return;
    }

    console.log('all exceptions', exception);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let error = 'Error';

    // Log the exception
    this.logger.error('Unhandled exception caught', {
      context: 'AllExceptionsFilter',
      statusCode,
      path: request.url,
      method: request.method,
      exception:
        exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });
    // let errorCode: string | undefined = undefined;
    // let errorFields: string[] | undefined = undefined;

    // Check if exception has a status property
    if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception &&
      typeof exception.status === 'number'
    ) {
      statusCode = exception.status;
    }

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') message = res;
      else if (typeof res === 'object' && res['message']) {
        const resMessage = res['message'] as string | string[];
        message = Array.isArray(resMessage)
          ? resMessage.join(', ')
          : String(resMessage);
      }
      error = exception.name;
    }

    // Generic JS Error
    else if (exception instanceof Error) {
      // statusCode = exception.;
      message = exception.message;
      error = exception.name;
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      stack:
        process.env.NODE_ENV === 'development' && exception instanceof Error
          ? exception.stack
          : null,
    });
  }
}
