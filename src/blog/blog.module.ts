import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaService } from 'src/common/services/prisma.service';

@Module({
  controllers: [BlogController],
  providers: [BlogService, PrismaService],
})
export class BlogModule {}
