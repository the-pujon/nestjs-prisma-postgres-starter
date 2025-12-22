import { Injectable } from '@nestjs/common';
import { createBlogDto } from './dto/createBlog.dto';
import { responseBlogDto } from './dto/responseBlog.dto';
import { PrismaService } from 'src/common/services/prisma.service';
// import { prisma } from 'lib/prisma';

@Injectable()
export class BlogService {
  private prismaService: PrismaService;

  constructor(prismaService: PrismaService) {
    this.prismaService = prismaService;
  }

  async createPost(Payload: createBlogDto): Promise<responseBlogDto> {
    const savedData = await this.prismaService.client.post.create({
      data: Payload,
    });
    return {
      ...savedData,
      content: savedData.content ?? undefined,
      published: savedData.published ?? undefined,
      authorId: savedData.authorId ?? undefined,
    };
  }
}
