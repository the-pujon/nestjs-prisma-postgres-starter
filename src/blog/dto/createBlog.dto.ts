import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class createBlogDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsInt()
  authorId: number;

  @IsString()
  author: string;
}
