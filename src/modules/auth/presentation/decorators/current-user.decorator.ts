import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Current User Decorator
 *
 * Extracts the current authenticated user from the request.
 * Must be used in conjunction with JwtAuthGuard.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);

/**
 * Current User ID Decorator
 *
 * Extracts just the user ID from the authenticated user.
 *
 * @example
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('my-data')
 * getMyData(@CurrentUserId() userId: string) {
 *   return this.service.getUserData(userId);
 * }
 * ```
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.userId;
  },
);
