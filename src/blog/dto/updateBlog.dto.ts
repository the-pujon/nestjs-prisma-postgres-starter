import { PartialType } from '@nestjs/mapped-types';
import { createBlogDto } from './createBlog.dto';

export class updateBlogDto extends PartialType(createBlogDto) {}
