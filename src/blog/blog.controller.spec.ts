import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { PrismaService } from 'src/common/services/prisma.service';
import { createBlogDto } from './dto/createBlog.dto';

const mockResult = {
  id: 1,
  title: 'Test Post',
  content: 'Test Content',
  published: true,
  authorId: 1,
  author: 'Test Author',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock PrismaService
const mockPrismaService = {
  post: {
    create: jest.fn().mockResolvedValue(mockResult),
    findMany: jest.fn().mockResolvedValue([mockResult]),
    findUnique: jest.fn().mockResolvedValue(mockResult),
    update: jest.fn().mockResolvedValue(mockResult),
    delete: jest.fn().mockResolvedValue(mockResult),
  },
};

describe('BlogController', () => {
  let controller: BlogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogController],
      providers: [
        BlogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<BlogController>(BlogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createBlog', () => {
    it('should create a blog', async () => {
      const payload: createBlogDto = {
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      };
      const result = await controller.createBlog(payload);
      expect(result).toMatchObject({
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getAllPost', () => {
    it('should return all posts', async () => {
      const results = await controller.getAllPost();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      });
      expect(results[0].createdAt).toBeInstanceOf(Date);
      expect(results[0].updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('getPostById', () => {
    it('should return a post by id', async () => {
      const result = await controller.getPostById('1');
      expect(result).toMatchObject({
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updatePost', () => {
    it('should update a post', async () => {
      const payload: createBlogDto = {
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      };
      const result = await controller.updatePost('1', payload);
      expect(result).toMatchObject({
        id: 1,
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deletePost', () => {
    it('should delete a post', async () => {
      const result = await controller.deletePost('1');
      expect(result).toMatchObject({
        id: 1,
        title: 'Test Post',
      });
    });
  });
});
