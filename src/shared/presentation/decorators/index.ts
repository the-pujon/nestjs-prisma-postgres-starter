/**
 * Swagger Decorators and Utilities
 *
 * This module exports all Swagger-related decorators and utilities.
 * These make it easy to document APIs without repeating boilerplate.
 *
 * Basic usage examples:
 *
 * 1. Single item response:
 * @ApiResponseDecorator(200, 'User retrieved', UserEntity)
 *
 * 2. Array response:
 * @ApiArrayResponseDecorator(200, 'Users list', UserEntity)
 *
 * 3. Paginated response:
 * @ApiPaginatedResponseDecorator(UserEntity)
 *
 * 4. For authenticated endpoints, add:
 * @ApiBearerAuth('JWT-auth')
 */

// Response decorators
export {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponseDecorator,
  ApiSuccessArrayResponseDecorator,
  ApiCommonErrorResponses,
  ApiResponseDecorator,
  ApiArrayResponseDecorator,
} from './api-response.decorator';

// Pagination decorators and utilities
export {
  PaginationMeta,
  PaginatedResponse,
  ApiPaginatedResponseDecorator,
  PaginationDto,
  createPaginatedResponse,
} from './api-pagination.decorator';
