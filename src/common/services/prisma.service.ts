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
import { Injectable } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }
}