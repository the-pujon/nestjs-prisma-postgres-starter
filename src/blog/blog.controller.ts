import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { createBlogDto } from './dto/createBlog.dto';
import { responseBlogDto } from './dto/responseBlog.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';

@Controller('api/blog')
export class BlogController {
  constructor(private blogService: BlogService) { }

  @Post('/')
  @UseGuards(AuthGuard)
  createBlog(@Body() payload: createBlogDto): Promise<responseBlogDto> {
    return this.blogService.createPost(payload);

  }

  @Get('/')
  @UseGuards(AuthGuard)
  getAllPost(): Promise<responseBlogDto[]> {
    return this.blogService.getAllPost();
  }

  @Get('/:id')
  getPostById(@Param('id') id: string): Promise<responseBlogDto> {
    return this.blogService.getPostById(id);
  }

  @Put('/:id')
  updatePost(
    @Param('id') id: string,
    @Body() payload: createBlogDto,
  ): Promise<responseBlogDto> {
    return this.blogService.updatePost(id, payload);
  }

  @Delete('/:id')
  deletePost(@Param('id') id: string): Promise<responseBlogDto> {
    return this.blogService.deletePost(id);
  }
}
