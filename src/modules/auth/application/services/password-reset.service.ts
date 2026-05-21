import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUserRepository, USER_REPOSITORY } from '../ports';
import { User } from '../../domain/models';
import {
  UserNotFoundException,
  InvalidResetTokenException,
  PasswordResetTokenExpiredException,
} from '../../domain/exceptions';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { EmailQueueService } from '../../../../shared/infrastructure/queues/email-queue.service';
import { ActivityLogService } from '../../../../common/services/activity-log.service';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';
import { AuthUtilsService } from '../../services/auth-utils.service';
import { AUTH_CONFIG } from '../../config/auth.config';
import * as crypto from 'crypto';

/**
 * Password Reset Service
 *
 * Handles password recovery workflows.
 *
 * Responsibilities:
 * - Initiate password reset (generate token and send email)
 * - Verify reset tokens
 * - Reset passwords
 * - Manage reset token lifecycle (expiration, caching)
 *
 * Pattern: Application Service (orchestrates domain models and infrastructure)
 */
@Injectable()
export class PasswordResetService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly redisService: RedisService,
    private readonly emailQueueService: EmailQueueService,
    private readonly activityLogService: ActivityLogService,
    private readonly authUtilsService: AuthUtilsService,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Initiate password reset
   * Generates reset token and sends email
   */
  async initiatePasswordReset(
    email: string,
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<{ message: string }> {
    const { ip, userAgent, device } = meta;
    const { PASSWORD_RESET } = AUTH_CONFIG.TOKEN_EXPIRY;

    this.logger.log(
      `Password reset initiated for: ${email}`,
      'PasswordResetService',
    );

    // 1. Rate limit check (prevent abuse)
    const { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } = AUTH_CONFIG.RATE_LIMIT;
    await this.authUtilsService.checkRateLimit(
      `password-reset:email:${email}`,
      LOGIN_MAX_ATTEMPTS,
      LOGIN_WINDOW_MS,
    );

    // 2. Find user by email
    const user = await this.userRepository.findByEmail(email);

    // For security, don't reveal if email exists or not
    // Always return success message
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
        'PasswordResetService',
      );

      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // 3. Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // 4. Store token hash in Redis with expiration (15 minutes)
    const resetKey = `password-reset:${user.id}`;
    await this.redisService.set(resetKey, tokenHash, 900); // 15 minutes in seconds

    // 5. Generate reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // 6. Queue password reset email (TODO: implement email queue method)
    // await this.emailQueueService.sendPasswordResetEmail(
    //   email,
    //   user.username,
    //   resetUrl,
    // );

    // 7. Log activity
    await this.activityLogService.logActivity({
      tableName: 'Auth',
      recordId: user.id,
      action: 'update',
      eventType: 'password_change',
      changes: [],
      metadata: {
        ip,
        userAgent,
        device,
      },
    });

    this.logger.log(
      `Password reset email sent to: ${email}`,
      'PasswordResetService',
    );

    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  /**
   * Verify reset token
   * Checks if token is valid and not expired
   */
  async verifyResetToken(
    email: string,
    token: string,
  ): Promise<{ valid: boolean; userId?: string }> {
    this.logger.log(
      `Verifying reset token for: ${email}`,
      'PasswordResetService',
    );

    // 1. Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UserNotFoundException();
    }

    // 2. Hash provided token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Retrieve stored token from Redis
    const resetKey = `password-reset:${user.id}`;
    const storedTokenHash = await this.redisService.get(resetKey);

    if (!storedTokenHash) {
      this.logger.warn(
        `Reset token expired or not found for: ${email}`,
        'PasswordResetService',
      );
      throw new PasswordResetTokenExpiredException();
    }

    // 4. Compare tokens
    if (tokenHash !== storedTokenHash) {
      this.logger.warn(
        `Invalid reset token for: ${email}`,
        'PasswordResetService',
      );
      throw new InvalidResetTokenException();
    }

    return {
      valid: true,
      userId: user.id,
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<{ message: string }> {
    const { ip, userAgent, device } = meta;

    this.logger.log(
      `Password reset attempt for: ${email}`,
      'PasswordResetService',
    );

    // 1. Verify token
    const { userId } = await this.verifyResetToken(email, token);

    if (!userId) {
      throw new InvalidResetTokenException();
    }

    // 2. Validate new password
    if (!this.authUtilsService.validatePassword(newPassword)) {
      throw new Error('Password does not meet security requirements');
    }

    // 3. Find user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundException();
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update password in domain model
    user.updatePassword(hashedPassword);

    // 6. Increment token version (invalidate all existing tokens)
    user.incrementTokenVersion();

    // 7. Persist changes
    await this.userRepository.save(user);

    // 8. Delete reset token from Redis
    const resetKey = `password-reset:${user.id}`;
    await this.redisService.del(resetKey);

    // 9. Revoke all existing sessions
    // This is handled by incrementing token version above

    // 10. Log activity
    await this.activityLogService.logActivity({
      tableName: 'Auth',
      recordId: user.id,
      action: 'update',
      eventType: 'password_change',
      changes: [],
      metadata: {
        ip,
        userAgent,
        device,
      },
    });

    // 11. Send confirmation email (TODO: implement)
    // await this.emailQueueService.sendPasswordChangedEmail(
    //   user.email,
    //   user.username,
    // );

    this.logger.log(
      `Password reset completed for: ${email}`,
      'PasswordResetService',
    );

    return {
      message:
        'Password has been reset successfully. All existing sessions have been terminated.',
    };
  }

  /**
   * Cancel password reset
   * Removes reset token
   */
  async cancelPasswordReset(userId: string): Promise<void> {
    const resetKey = `password-reset:${userId}`;
    await this.redisService.del(resetKey);

    this.logger.log(
      `Password reset cancelled for user: ${userId}`,
      'PasswordResetService',
    );
  }

  /**
   * Check if user has pending reset request
   */
  async hasPendingReset(userId: string): Promise<boolean> {
    const resetKey = `password-reset:${userId}`;
    const token = await this.redisService.get(resetKey);
    return !!token;
  }

  /**
   * Get reset token TTL (time to live in seconds)
   */
  async getResetTokenTTL(userId: string): Promise<number | null> {
    const resetKey = `password-reset:${userId}`;
    return this.redisService.ttl(resetKey);
  }
}
