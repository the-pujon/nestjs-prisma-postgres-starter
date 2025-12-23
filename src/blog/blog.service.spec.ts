import { Test, TestingModule } from '@nestjs/testing';
import { BlogService } from './blog.service';
import { createBlogDto } from './dto/createBlog.dto';
import { responseBlogDto } from './dto/responseBlog.dto';

describe('BlogService', () => {
  let service: BlogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlogService],
    }).compile();

    service = module.get<BlogService>(BlogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  describe('createPost', () => {
    it('should create a post', () => {
      const payload: createBlogDto = {
        title: 'Test Post',
        content: 'Test Content',
        published: true,
        authorId: 1,
        author: 'Test Author',
      };
      const result: responseBlogDto = {
        ...payload,
        id: 1,
        title: payload.title ?? undefined,
        content: payload.content ?? undefined,
        published: payload.published ?? undefined,
        authorId: payload.authorId ?? undefined,
        author: payload.author ?? undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(service.createPost(payload)).resolves.toEqual(result);
    });
  });


  describe('getAllPost', () => {
    it('should return all posts', () => {
      const result: responseBlogDto[] = [
        {
          id: 1,
          title: 'Test Post',
          content: 'Test Content',
          published: true,
          authorId: 1,
          author: 'Test Author',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      expect(service.getAllPost()).resolves.toEqual(result);
    });
  });
});
