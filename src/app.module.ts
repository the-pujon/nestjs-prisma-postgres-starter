import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// Shared Module
import { SharedModule } from './shared/shared.module';
// Clean Architecture Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
// Legacy Modules (to be refactored)
import { RedisModule } from './common/modules/redis.module';
import { RateLimitModule } from './common/modules/rate-limit.module';
import { MetricsModule } from './metrics/metrics.module';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/config/winston.config';

@Module({
  imports: [
    // Load environment variables globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Winston logger module (global - can be injected anywhere)
    WinstonModule.forRoot(winstonConfig),
    // Shared infrastructure module (global - provides DB, Redis, CustomLogger, etc.)
    SharedModule,
    // Redis module (global - can be injected anywhere)
    RedisModule,
    // Rate limiting module (global - throttles requests using Redis)
    RateLimitModule,
    // Metrics module (global - Prometheus metrics)
    MetricsModule,
    // BlogModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
