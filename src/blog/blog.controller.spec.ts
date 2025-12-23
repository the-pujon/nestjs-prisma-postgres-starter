import { Test, TestingModule } from '@nestjs/testing';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
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

// Mock PrismaService
const mockPrismaService = {
  client: {
    post: {
      create: jest.fn().mockResolvedValue(mockResult),
      findMany: jest.fn().mockResolvedValue([mockResult]),
      findUnique: jest.fn().mockResolvedValue(mockResult),
      update: jest.fn().mockResolvedValue(mockResult),
      delete: jest.fn().mockResolvedValue(mockResult),
    },
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
});
