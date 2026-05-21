import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@SkipThrottle() // Skip rate limiting for metrics endpoints
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @ApiExcludeEndpoint() // Exclude from Swagger as it returns Prometheus format
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @ApiOperation({ summary: 'Get metrics in JSON format' })
  @Get('metrics/json')
  async getMetricsJSON(): Promise<any> {
    return this.metricsService.getMetricsJSON();
  }
}
