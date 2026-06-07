import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from '../ports';
import { USER_REPOSITORY } from '../ports';
import { UserProfile } from '../../domain/models/user-profile.model';
import {
  UserNotFoundException,
  UserDeletionException,
} from '../../domain/exceptions/user.exceptions';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';
import { ActivityLogService } from '../../../../shared/infrastructure/services/activity-log.service';

/**
 * User Management Service
 *
 * Handles administrative user operations.
 *
 * Layer: Application (Clean Architecture)
 * Responsibilities:
 * - List users
 * - Get user details
 * - Delete users
 * - User statistics
 */
@Injectable()
export class UserManagementService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly activityLogService: ActivityLogService,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Get all users with pagination
   */
  async getAllUsers(
    page = 1,
    limit = 10,
  ): Promise<{
    users: UserProfile[];
    total: number;
    page: number;
    pages: number;
  }> {
    this.logger.log(
      `Fetching users - page: ${page}, limit: ${limit}`,
      'UserManagementService',
    );

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.userRepository.findAll(skip, limit),
      this.userRepository.count(),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      users,
      total,
      page,
      pages,
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile> {
    this.logger.log(`Fetching user: ${userId}`, 'UserManagementService');

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return user;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserProfile> {
    this.logger.log(
      `Fetching user by email: ${email}`,
      'UserManagementService',
    );

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UserNotFoundException(email);
    }

    return user;
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<UserProfile> {
    this.logger.log(
      `Fetching user by username: ${username}`,
      'UserManagementService',
    );

    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      throw new UserNotFoundException(username);
    }

    return user;
  }

  /**
   * Delete user (soft delete recommended in production)
   */
  async deleteUser(
    userId: string,
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    this.logger.warn(
      `Deleting user: ${userId} by: ${deletedBy}`,
      'UserManagementService',
    );

    // Check if user exists
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Prevent self-deletion (if admin is deleting)
    if (userId === deletedBy) {
      throw new UserDeletionException('Cannot delete your own account');
    }

    // Log the deletion activity
    await this.activityLogService.logActivity({
      tableName: 'Auth',
      recordId: userId,
      action: 'delete',
      eventType: 'delete',
      changes: [],
      metadata: {
        actionedBy: deletedBy,
      },
    });

    // Delete user
    await this.userRepository.delete(userId);

    this.logger.log(`User deleted: ${userId}`, 'UserManagementService');
  }

  /**
   * Get user count
   */
  async getUserCount(): Promise<number> {
    return this.userRepository.count();
  }

  /**
   * Search users by email or username
   */
  async searchUsers(query: string): Promise<UserProfile[]> {
    this.logger.log(`Searching users: ${query}`, 'UserManagementService');

    // For a simple implementation, fetch all and filter
    // In production, implement proper search in repository
    const users = await this.userRepository.findAll(0, 100);

    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.getFullName().toLowerCase().includes(query.toLowerCase()),
    );
  }
}
