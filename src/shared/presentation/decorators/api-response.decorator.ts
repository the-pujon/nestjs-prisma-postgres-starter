import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
  ApiProperty,
} from '@nestjs/swagger';

/**
 * Base API response wrapper matching the TransformInterceptor output
 */
export class ApiSuccessResponse<T> {
  @ApiProperty({ example: 200, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Success', description: 'Response message' })
  message: string;

  data: T;
}

/**
 * API error response matching the AllExceptionsFilter output
 */
export class ApiErrorResponse {
  @ApiProperty({ example: false, description: 'Success flag' })
  success: boolean;

  @ApiProperty({ example: 400, description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({
    example: 'Validation failed',
    description: 'Error message',
  })
  message: string;

  @ApiProperty({ example: 'BadRequestException', description: 'Error type' })
  error: string;

  @ApiProperty({
    example: '2026-02-03T10:30:00.000Z',
    description: 'Timestamp of the error',
  })
  timestamp: string;

  @ApiProperty({ example: '/api/users', description: 'Request path' })
  path: string;

  @ApiProperty({
    required: false,
    description: 'Stack trace (only in development)',
    nullable: true,
  })
  stack?: string | null;
}

/**
 * Decorator for successful API responses
 * Automatically wraps the response in the standard format
 *
 * @param status - HTTP status code (default: 200)
 * @param description - Response description
 * @param dataType - The type of data being returned
 *
 * @example
 * @ApiSuccessResponseDecorator(200, 'User retrieved successfully', UserEntity)
 * @Get(':id')
 * findOne(@Param('id') id: string) {
 *   return this.userService.findOne(id);
 * }
 */
export const ApiSuccessResponseDecorator = <TModel extends Type<any>>(
  status: number = 200,
  description: string = 'Successful response',
  dataType?: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponse, dataType || Object),
    ApiResponse({
      status,
      description,
      schema: dataType
        ? {
            allOf: [
              { $ref: getSchemaPath(ApiSuccessResponse) },
              {
                properties: {
                  data: {
                    $ref: getSchemaPath(dataType),
                  },
                },
              },
            ],
          }
        : {
            allOf: [
              { $ref: getSchemaPath(ApiSuccessResponse) },
              {
                properties: {
                  data: {
                    type: 'object',
                  },
                },
              },
            ],
          },
    }),
  );
};

/**
 * Decorator for array/list responses
 * @example
 * @ApiSuccessArrayResponseDecorator(200, 'Users retrieved successfully', UserEntity)
 * @Get()
 * findAll() {
 *   return this.userService.findAll();
 * }
 */
export const ApiSuccessArrayResponseDecorator = <TModel extends Type<any>>(
  status: number = 200,
  description: string = 'Successful response',
  dataType: TModel,
) => {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponse, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataType) },
              },
            },
          },
        ],
      },
    }),
  );
};

/**
 * Decorator for common error responses
 * Automatically adds standard error response documentation
 */
export const ApiCommonErrorResponses = () => {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponse),
    ApiResponse({
      status: 400,
      description: 'Bad Request - Invalid input data',
      schema: { $ref: getSchemaPath(ApiErrorResponse) },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Authentication required',
      schema: { $ref: getSchemaPath(ApiErrorResponse) },
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Insufficient permissions',
      schema: { $ref: getSchemaPath(ApiErrorResponse) },
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Resource not found',
      schema: { $ref: getSchemaPath(ApiErrorResponse) },
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - Something went wrong',
      schema: { $ref: getSchemaPath(ApiErrorResponse) },
    }),
  );
};

/**
 * Comprehensive decorator combining success and error responses
 * Use this for most endpoints
 *
 * @example
 * @ApiResponseDecorator(200, 'User created successfully', UserEntity)
 * @Post()
 * create(@Body() createUserDto: CreateUserDto) {
 *   return this.userService.create(createUserDto);
 * }
 */
export const ApiResponseDecorator = <TModel extends Type<any>>(
  status: number = 200,
  description: string = 'Successful response',
  dataType?: TModel,
) => {
  return applyDecorators(
    ApiSuccessResponseDecorator(status, description, dataType),
    ApiCommonErrorResponses(),
  );
};

/**
 * Comprehensive decorator for array responses
 */
export const ApiArrayResponseDecorator = <TModel extends Type<any>>(
  status: number = 200,
  description: string = 'Successful response',
  dataType: TModel,
) => {
  return applyDecorators(
    ApiSuccessArrayResponseDecorator(status, description, dataType),
    ApiCommonErrorResponses(),
  );
};
