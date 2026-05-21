// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { PrismaClient } from 'generated/prisma/client';
// // import { PrismaClient } from '@prisma/client';

// @Injectable()
// export class PrismaService
//   extends PrismaClient
//   implements OnModuleInit, OnModuleDestroy {
//   constructor() {
//     super({});
//   }

//   public client = this;

//   async onModuleInit() {
//     await this.client.$connect();
//   }

//   async onModuleDestroy() {
//     await this.client.$disconnect();
//   }
// }

// // export const prismaService = new PrismaService().client;

import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { CustomLoggerService } from '../logging/logger.service';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly customLogger: CustomLoggerService) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });

    super({ adapter });
  }

  async onModuleInit() {
    this.customLogger.log('Connecting to database...', 'PrismaService');
    await this.$connect();
    this.customLogger.log('Database connected successfully', 'PrismaService');
  }

  async onModuleDestroy() {
    this.customLogger.log('Disconnecting from database...', 'PrismaService');
    await this.$disconnect();
    this.customLogger.log('Database disconnected', 'PrismaService');
  }
}
