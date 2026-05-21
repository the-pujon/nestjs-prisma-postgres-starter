import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { method, route } = request;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const routePath = (route?.path as string) || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode;

          this.metricsService.recordHttpRequest(
            method,
            routePath,
            statusCode,
            duration,
          );
        },
        error: (error: any) => {
          const duration = (Date.now() - startTime) / 1000;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const statusCode = (error.status as number) || 500;

          this.metricsService.recordHttpRequest(
            method,
            routePath,
            statusCode,
            duration,
          );

          this.metricsService.recordHttpError(
            method,
            routePath,
            statusCode,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (error.name as string) || 'UnknownError',
          );
        },
      }),
    );
  }
}
