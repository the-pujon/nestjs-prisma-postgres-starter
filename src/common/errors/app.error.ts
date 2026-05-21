import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom Application Error class
 * Extends HttpException to provide consistent error handling
 */
class AppError extends HttpException {
  constructor(statusCode: number, message: string, errors?: unknown) {
    super(
      {
        statusCode,
        message,
        errors,
        error: AppError.name,
      },
      statusCode,
    );
  }

  static badRequest(
    message: string,
    errors?: unknown,
    code?: string,
  ): AppError {
    return new AppError(HttpStatus.BAD_REQUEST, message, { errors, code });
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(HttpStatus.FORBIDDEN, message);
  }

  static notFound(message: string = 'Not Found'): AppError {
    return new AppError(HttpStatus.NOT_FOUND, message);
  }

  static conflict(message: string, errors?: unknown): AppError {
    return new AppError(HttpStatus.CONFLICT, message, errors);
  }

  static internalServerError(
    message: string = 'Internal Server Error',
  ): AppError {
    return new AppError(HttpStatus.INTERNAL_SERVER_ERROR, message);
  }

  static tooManyRequests(message: string = 'Too Many Requests'): AppError {
    return new AppError(HttpStatus.TOO_MANY_REQUESTS, message);
  }

  static serviceUnavailable(message: string = 'Service Unavailable'): AppError {
    return new AppError(HttpStatus.SERVICE_UNAVAILABLE, message);
  }
}

export default AppError;
