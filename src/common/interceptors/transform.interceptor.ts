import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { SuccessResponseDto } from '../dto/success-response.dto';

export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponseDto<T>
> {
  constructor(
    private defaultMessage: string = 'Success',
    private defaultStatusCode = 200,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();

        const statusCode = response.statusCode || this.defaultStatusCode;
        const message = this.defaultMessage;

        return {
          statusCode,
          message,
          data,
        };
      }),
    );
  }
}
