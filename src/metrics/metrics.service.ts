import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Histogram,
  Counter,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: Registry;

  // Default metrics
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestTotal: Counter;
  public readonly httpRequestErrors: Counter;

  // Custom business metrics
  public readonly activeUsers: Gauge;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.register = new Registry();

    // Set default labels for all metrics
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.register.setDefaultLabels({
      app: 'nestjs-app',
      environment: process.env.NODE_ENV || 'development',
    });

    // Collect default Node.js metrics (CPU, memory, etc.)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    collectDefaultMetrics({ register: this.register });

    // HTTP request duration histogram
    // for tracking request latencies
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    // HTTP request counter
    // for request rate per second
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    // HTTP errors counter
    // for tracking HTTP request errors
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status_code', 'error_type'],
      registers: [this.register],
    });

    // Active users gauge
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of currently active users',
      registers: [this.register],
    });
  }

  onModuleInit() {
    console.log('Metrics service initialized');
  }

  // Get all metrics
  // eslint-disable-next-line @typescript-eslint/require-await
  async getMetrics(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.register.metrics();
  }

  // Get metrics in JSON format
  // eslint-disable-next-line @typescript-eslint/require-await
  async getMetricsJSON(): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return this.register.getMetricsAsJSON();
  }

  // Helper method to record HTTP request
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.httpRequestTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  // Helper method to record HTTP error
  recordHttpError(
    method: string,
    route: string,
    statusCode: number,
    errorType: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.httpRequestErrors.inc({
      method,
      route,
      status_code: statusCode.toString(),
      error_type: errorType,
    });
  }

  // Helper method to update active users
  setActiveUsers(count: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.activeUsers.set(count);
  }
}
