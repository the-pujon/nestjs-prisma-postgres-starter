/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
} from '@nestjs/common';
import { map, Observable, tap } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  private readonly defaultMessage: string = 'Success';
  private readonly defaultStatusCode = 200;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;
    const method = request.method;
    const startTime = Date.now();

    // Skip transformation for metrics endpoint (needs raw Prometheus format)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    if (path === '/metrics' || path.startsWith('/metrics?')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.logger.info('Request processed', {
          context: 'TransformInterceptor',
          method,
          path,
          duration,
        });
      }),
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
