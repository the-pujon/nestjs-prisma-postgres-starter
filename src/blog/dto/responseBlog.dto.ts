import { Expose } from 'class-transformer';

export class responseBlogDto {
  @Expose()
  title: string;

  @Expose()
  content?: string;

  @Expose()
  published?: boolean;

  @Expose()
  authorId?: number;

  @Expose()
  author: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
