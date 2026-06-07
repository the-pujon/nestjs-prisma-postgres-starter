import { Global, Module } from '@nestjs/common';
import { CustomLoggerService } from '../logging/logger.service';

@Global()
@Module({
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class LoggerModule {}
