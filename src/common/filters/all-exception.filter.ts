import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    console.log('all exceptions', exception);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error';
    let error = 'Error';
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
