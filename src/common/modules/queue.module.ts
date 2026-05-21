import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import config from '../config/app.config';
import { EmailService } from '../services/email.service';
import { EmailQueueService } from '../../shared/infrastructure/queues/email-queue.service';
import { EmailProcessor } from '../queues/email/email.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
      prefix: `${config.redis_cache_key_prefix}:bull`,
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailQueueService, EmailProcessor, EmailService],
  exports: [EmailQueueService, BullModule],
})
export class QueueModule {}
