import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from 'lib/prisma';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}

// export const prismaService = new PrismaService().client;
