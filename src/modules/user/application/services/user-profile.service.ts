import { Inject, Injectable } from '@nestjs/common';
import type { IUserRepository } from '../ports';
import { USER_REPOSITORY } from '../ports';
import { UserProfile } from '../../domain/models/user-profile.model';
import { UserNotFoundException } from '../../domain/exceptions/user.exceptions';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';

/**
 * User Profile Service
 *
 * Handles user profile operations.
 *
 * Layer: Application (Clean Architecture)
 * Responsibilities:
 * - Get user profile
 * - Update user profile
 * - Profile completeness checks
 */
@Injectable()
export class UserProfileService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    this.logger.log(
      `Fetching profile for user: ${userId}`,
      'UserProfileService',
    );

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      avatar?: string;
    },
  ): Promise<UserProfile> {
    this.logger.log(
      `Updating profile for user: ${userId}`,
      'UserProfileService',
    );

    // Get user
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    // Update using domain logic
    user.updateProfile(updates);

    // Save changes
    const updated = await this.userRepository.save(user);

    this.logger.log(
      `Profile updated for user: ${userId}`,
      'UserProfileService',
    );

    return updated;
  }

  /**
   * Check if profile is complete
   */
  async isProfileComplete(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return user.isProfileComplete();
  }

  /**
   * Get user's full name
   */
  async getFullName(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException(userId);
    }

    return user.getFullName();
  }
}
