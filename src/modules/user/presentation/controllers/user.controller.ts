import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

// Application Services
import { UserProfileService } from '../../application/services/user-profile.service';
import { UserManagementService } from '../../application/services/user-management.service';

// Presentation Layer - DTOs
import { UpdateProfileDto } from '../dto/requests';
import { UserProfileResponseDto } from '../dto/responses';

// Guards and Decorators
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user.decorator';

// Shared Services
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';

/**
 * User Controller
 *
 * Handles all user-related HTTP endpoints.
 *
 * Layer: Presentation (Clean Architecture)
 * Responsibilities:
 * - HTTP request/response handling
 * - Input validation (via DTOs)
 * - Authentication/authorization
 * - Delegating to application services
 */
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userProfileService: UserProfileService,
    private readonly userManagementService: UserManagementService,
    private readonly logger: CustomLoggerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (with pagination)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserProfileResponseDto],
  })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    this.logger.log(
      `Fetching all users - page: ${page}, limit: ${limit}`,
      'UserController',
    );

    const result = await this.userManagementService.getAllUsers(page, limit);

    return {
      success: true,
      data: result,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: UserProfileResponseDto,
  })
  async getMyProfile(@CurrentUserId() userId: string) {
    this.logger.log(
      `Fetching profile for current user: ${userId}`,
      'UserController',
    );

    const profile = await this.userProfileService.getUserProfile(userId);

    return {
      success: true,
      data: profile.toJSON(),
    };
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserProfileResponseDto,
  })
  async updateMyProfile(
    @CurrentUserId() userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    this.logger.log(`Updating profile for user: ${userId}`, 'UserController');

    const updated = await this.userProfileService.updateProfile(
      userId,
      updateDto,
    );

    return {
      success: true,
      message: 'Profile updated successfully',
      data: updated.toJSON(),
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by email, username, or name' })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    type: [UserProfileResponseDto],
  })
  async searchUsers(@Query('q') query: string) {
    this.logger.log(`Searching users with query: ${query}`, 'UserController');

    const users = await this.userManagementService.searchUsers(query);

    return {
      success: true,
      data: users.map((u) => u.toJSON()),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    this.logger.log(`Fetching user: ${id}`, 'UserController');

    const user = await this.userManagementService.getUserById(id);

    return {
      success: true,
      data: user.toJSON(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user (admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUserId() deletedBy: string,
    @Body('reason') reason?: string,
  ) {
    this.logger.log(`Deleting user: ${id} by: ${deletedBy}`, 'UserController');

    await this.userManagementService.deleteUser(id, deletedBy, reason);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}
