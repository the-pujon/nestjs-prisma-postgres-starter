import { Body, Controller, Post } from '@nestjs/common';
import { BlogService } from './blog.service';
import { createBlogDto } from './dto/createBlog.dto';
import { responseBlogDto } from './dto/responseBlog.dto';

@Controller('api/blog')
export class BlogController {
  constructor(private blogService: BlogService) {}

  @Post('/')
  createBlog(@Body() payload: createBlogDto): Promise<responseBlogDto> {
    return this.blogService.createPost(payload);
  }
}
