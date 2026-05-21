import { Module, Global, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { Redis as RedisType } from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

const createRedisClient = (
  configService: ConfigService,
  logger: Logger,
): RedisType => {
  const isProduction = configService.get('NODE_ENV') === 'production';

  const client = new Redis({
    host: configService.get<string>('REDIS_HOST', 'localhost'),
    port: configService.get<number>('REDIS_PORT', 6379),
    username: configService.get<string>('REDIS_USER'),
    password: configService.get<string>('REDIS_PASSWORD'),
    db: configService.get<number>('REDIS_DB', 0),

    // Connection & Retry Configuration
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis max connection retries reached. Stopping...', {
          context: 'RedisModule',
        });
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`, {
        context: 'RedisModule',
        attempt: times,
        delay,
      });
      return delay;
    },

    // TLS for production environments
    ...(isProduction &&
      configService.get<string>('REDIS_TLS') === 'true' && {
        tls: {
          rejectUnauthorized: true,
        },
      }),

    // Performance & Reliability
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    lazyConnect: false,

    // Auto-reconnect on connection loss
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
  });

  // Event listeners for monitoring
  client.on('error', (err) =>
    logger.error(`Redis error: ${err.message}`, {
      context: 'RedisModule',
      error: err.message,
    }),
  );
  client.on('connect', () =>
    logger.info('Redis connecting...', { context: 'RedisModule' }),
  );
  client.on('ready', () =>
    logger.info('Redis ready', { context: 'RedisModule' }),
  );
  client.on('close', () =>
    logger.warn('Redis connection closed', { context: 'RedisModule' }),
  );
  client.on('reconnecting', () =>
    logger.warn('Redis reconnecting...', { context: 'RedisModule' }),
  );

  return client;
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: createRedisClient,
      inject: [ConfigService, WINSTON_MODULE_PROVIDER],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: RedisType,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.logger.info('Closing Redis connection...', {
        context: 'RedisModule',
      });
      await this.client.quit();
      this.logger.info('Redis connection closed', { context: 'RedisModule' });
    }
  }
}
