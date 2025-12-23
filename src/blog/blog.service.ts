import { Injectable } from '@nestjs/common';
import { createBlogDto } from './dto/createBlog.dto';
import { responseBlogDto } from './dto/responseBlog.dto';
import { PrismaService } from 'src/common/services/prisma.service';
// import { PrismaService } from 'src/common/services/prisma.service';
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

  async getAllPost(): Promise<responseBlogDto[]> {
    const savedData = await this.prismaService.client.post.findMany();
    return savedData.map((data) => {
      return {
        ...data,
        content: data.content ?? undefined,
        published: data.published ?? undefined,
        authorId: data.authorId ?? undefined,
      };
    });
  }

  async getPostById(id: string): Promise<responseBlogDto> {
    const savedData = await this.prismaService.client.post.findUnique({
      where: {
        id: Number(id),
      },
    });
    if (!savedData) {
      throw new Error('Post not found');
    }
    return {
      ...savedData,
      content: savedData.content ?? undefined,
      published: savedData.published ?? undefined,
      authorId: savedData.authorId ?? undefined,
    };
  }

  async updatePost(
    id: string,
    payload: createBlogDto,
  ): Promise<responseBlogDto> {
    const savedData = await this.prismaService.client.post.update({
      where: {
        id: Number(id),
      },
      data: payload,
    });
    return {
      ...savedData,
      content: savedData.content ?? undefined,
      published: savedData.published ?? undefined,
      authorId: savedData.authorId ?? undefined,
    };
  }

  async deletePost(id: string): Promise<responseBlogDto> {
    const savedData = await this.prismaService.client.post.delete({
      where: {
        id: Number(id),
      },
    });
    return {
      ...savedData,
      content: savedData.content ?? undefined,
      published: savedData.published ?? undefined,
      authorId: savedData.authorId ?? undefined,
    };
  }
}
