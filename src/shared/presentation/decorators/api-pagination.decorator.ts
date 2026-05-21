import { Type, applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessResponseDecorator } from './api-response.decorator';

/**
 * Pagination metadata
 */
export class PaginationMeta {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 100, description: 'Total number of items' })
  total: number;

  @ApiProperty({ example: 10, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Has previous page' })
  hasPreviousPage: boolean;

  @ApiProperty({ example: true, description: 'Has next page' })
  hasNextPage: boolean;
}

/**
 * Generic paginated response wrapper
 */
export class PaginatedResponse<T> {
  @ApiProperty({ type: [Object], description: 'Array of items' })
  items: T[];

  @ApiProperty({ type: PaginationMeta, description: 'Pagination metadata' })
  meta: PaginationMeta;
}

/**
 * Decorator for paginated list responses
 *
 * @example
 * @ApiPaginatedResponseDecorator(UserEntity)
 * @Get()
 * findAll(@Query() paginationDto: PaginationDto) {
 *   return this.userService.findAllPaginated(paginationDto);
 * }
 */
export const ApiPaginatedResponseDecorator = <TModel extends Type<any>>(
  dataType: TModel,
  status: number = 200,
  description: string = 'Paginated list retrieved successfully',
) => {
  return applyDecorators(
    ApiExtraModels(PaginatedResponse, PaginationMeta, dataType),
    ApiSuccessResponseDecorator(status, description, PaginatedResponse),
  );
};

/**
 * Common pagination query parameters DTO
 * Use this in your controllers for consistent pagination
 *
 * @example
 * @Get()
 * findAll(@Query() pagination: PaginationDto) {
 *   return this.service.findAll(pagination);
 * }
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  limit?: number = 10;

  @ApiProperty({
    description: 'Search query',
    example: 'john',
    required: false,
  })
  search?: string;

  @ApiProperty({
    description: 'Sort field',
    example: 'createdAt',
    required: false,
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Helper function to create paginated response
 *
 * @example
 * const users = await this.prisma.user.findMany({ skip, take });
 * const total = await this.prisma.user.count();
 * return createPaginatedResponse(users, total, page, limit);
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number = 1,
  limit: number = 10,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
  };
}
