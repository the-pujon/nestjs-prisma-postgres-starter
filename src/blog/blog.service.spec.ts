import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { createBlogDto } from './dto/createBlog.dto';
import { responseBlogDto } from './dto/responseBlog.dto';
import { PrismaService } from 'src/common/services/prisma.service';

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

// Mock PrismaService - matches how BlogService uses this.prismaService.client.post
const mockPrismaService = {

  post: {
    create: jest.fn().mockResolvedValue(mockResult),
    findMany: jest.fn().mockResolvedValue([mockResult]),
    findUnique: jest.fn().mockResolvedValue(mockResult),
    update: jest.fn().mockResolvedValue(mockResult),
    delete: jest.fn().mockResolvedValue(mockResult),
  },

};

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    it('should create a post', async () => {
      const payload: createBlogDto = {
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      };
      const result: responseBlogDto = mockResult;
      await expect(service.createPost(payload)).resolves.toEqual(result);
    });
  });

  describe('getAllPost', () => {
    it('should return all posts', async () => {
      const result: responseBlogDto[] = [mockResult];
      await expect(service.getAllPost()).resolves.toEqual(result);
    });
  });

  describe('getPostById', () => {
    it('should return a post by id', async () => {
      const result: responseBlogDto = mockResult;
      await expect(service.getPostById('1')).resolves.toEqual(result);
    });
  });
});
