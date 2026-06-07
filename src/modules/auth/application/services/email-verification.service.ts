import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository, USER_REPOSITORY } from '../ports';
import {
  InvalidVerificationCodeException,
  EmailAlreadyVerifiedException,
  UserNotFoundException,
} from '../../domain/exceptions';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { EmailQueueService } from '../../../../shared/infrastructure/queues/email-queue.service';
import { ActivityLogService } from '../../../../shared/infrastructure/services/activity-log.service';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';
import { AUTH_CONFIG } from '../../config/auth.config';
import config from '../../../shared/config/app.config';

/**
 * Email Verification Service
 *
 * Handles email verification workflows.
 *
 * Responsibilities:
 * - Generate and send verification codes
 * - Verify email addresses
 * - Resend verification emails
 * - Manage verification code lifecycle (expiration, caching)
 *
 * Pattern: Application Service (orchestrates domain models and infrastructure)
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly redisService: RedisService,
    private readonly emailQueueService: EmailQueueService,
    private readonly activityLogService: ActivityLogService,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Generate and send verification code
   */
  async sendVerificationCode(
    userId: string,
    email: string,
    username: string,
  ): Promise<void> {
    const { VERIFICATION } = AUTH_CONFIG.TOKEN_EXPIRY;

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Store code in Redis with expiration (24 hours)
    const verificationKey = `email-verify:${userId}`;
    await this.redisService.set(
      verificationKey,
      verificationCode,
      86400, // 24 hours in seconds
    );

    // Queue email
    await this.emailQueueService.sendVerificationEmail(
      email,
      username,
      verificationCode,
      userId,
    );

    this.logger.log(
      `Verification code sent to ${email} for user ${userId}`,
      'EmailVerificationService',
    );
  }

  /**
   * Verify email with code
   */
  async verifyEmail(
    email: string,
    code: string,
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<{ message: string }> {
    const { ip, userAgent, device } = meta;

    this.logger.log(
      `Email verification attempt for: ${email}`,
      'EmailVerificationService',
    );

    // 1. Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn(
        `Verification failed: User not found - ${email}`,
        'EmailVerificationService',
      );
      throw new UserNotFoundException();
    }

    // 2. Check if already verified
    if (user.isVerified()) {
      this.logger.warn(
        `Verification failed: Email already verified - ${email}`,
        'EmailVerificationService',
      );
      throw new EmailAlreadyVerifiedException();
    }

    // 3. Retrieve verification code from Redis
    const verificationKey = `email-verify:${user.id}`;
    const storedCode = await this.redisService.get(verificationKey);

    if (!storedCode || storedCode !== code) {
      this.logger.warn(
        `Verification failed: Invalid code for ${email}`,
        'EmailVerificationService',
      );
      throw new InvalidVerificationCodeException();
    }

    // 4. Verify email in domain model
    user.verifyEmail();

    // 5. Persist changes
    await this.userRepository.save(user);

    // 6. Clean up Redis
    await this.redisService.del(verificationKey);

    // 7. Log activity
    await this.activityLogService.logActivity({
      tableName: 'Auth',
      recordId: user.id,
      action: 'update',
      eventType: 'profile_update',
      changes: [],
      metadata: {
        ip,
        userAgent,
        device,
      },
    });

    this.logger.log(
      `Email verified successfully: ${email}`,
      'EmailVerificationService',
    );

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    email: string,
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<{ message: string }> {
    const { ip, userAgent, device } = meta;

    this.logger.log(
      `Resend verification email request for: ${email}`,
      'EmailVerificationService',
    );

    // 1. Find user by email
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn(
        `Resend failed: User not found - ${email}`,
        'EmailVerificationService',
      );
      throw new UserNotFoundException();
    }

    // 2. Check if already verified
    if (user.isVerified()) {
      this.logger.warn(
        `Resend failed: Email already verified - ${email}`,
        'EmailVerificationService',
      );
      throw new EmailAlreadyVerifiedException();
    }

    // 3. Send new verification code
    await this.sendVerificationCode(user.id, user.email, user.username);

    // 4. Log activity
    await this.activityLogService.logActivity({
      tableName: 'Auth',
      recordId: user.id,
      action: 'update',
      eventType: 'profile_update',
      changes: [],
      metadata: {
        ip,
        userAgent,
        device,
      },
    });

    this.logger.log(
      `Verification email resent to: ${email}`,
      'EmailVerificationService',
    );

    return {
      message: 'Verification email sent successfully',
    };
  }

  /**
   * Check if verification code is valid (without consuming it)
   */
  async isCodeValid(userId: string, code: string): Promise<boolean> {
    const verificationKey = `email-verify:${userId}`;
    const storedCode = await this.redisService.get(verificationKey);
    return storedCode === code;
  }

  /**
   * Delete verification code
   */
  async deleteVerificationCode(userId: string): Promise<void> {
    const verificationKey = `email-verify:${userId}`;
    await this.redisService.del(verificationKey);
  }

  /**
   * Get verification code TTL (time to live in seconds)
   */
  async getCodeTTL(userId: string): Promise<number | null> {
    const verificationKey = `email-verify:${userId}`;
    return this.redisService.ttl(verificationKey);
  }
}
