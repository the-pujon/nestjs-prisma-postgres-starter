import { Global, Module } from '@nestjs/common';
import { PrismaService } from './infrastructure/database/prisma.service';
import { RedisService } from './infrastructure/cache/redis.service';
import { CustomLoggerService } from './infrastructure/logging/logger.service';

/**
 * Shared Module
 *
 * Global module that provides shared infrastructure services
 * to all modules in the application.
 *
 * Services:
 * - PrismaService: Database connection
 * - RedisService: Cache and session storage
 * - CustomLoggerService: Application logging
 *
 * Note: ActivityLogService and EmailQueueService are not included here
 * as they have complex dependencies. Import them directly in modules that need them.
 */
@Global()
@Module({
  providers: [PrismaService, RedisService, CustomLoggerService],
  exports: [PrismaService, RedisService, CustomLoggerService],
})
export class SharedModule {}
