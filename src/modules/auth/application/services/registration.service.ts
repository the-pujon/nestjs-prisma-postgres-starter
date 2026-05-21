import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { IUserRepository, USER_REPOSITORY } from '../ports';
import { User } from '../../domain/models';
import {
  UserAlreadyExistsException,
  InvalidVerificationCodeException,
  EmailAlreadyVerifiedException,
} from '../../domain/exceptions';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';
import { EmailQueueService } from '../../../../shared/infrastructure/queues/email-queue.service';
import { ActivityLogService } from '../../../../common/services/activity-log.service';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';
import { AuthUtilsService } from '../../services/auth-utils.service';
import { AUTH_CONFIG } from '../../config/auth.config';
import config from '../../../../common/config/app.config';

/**
 * Registration Service
 *
 * Handles user registration and email verification workflows.
 *
 * Responsibilities:
 * - Register new users
 * - Generate and verify email verification codes
 * - Resend verification emails
 *
 * Pattern: Application Service (orchestrates domain models and infrastructure)
 */
@Injectable()
export class RegistrationService {
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
   * Register a new user
   */
  async register(
    data: {
      email: string;
      password: string;
      username: string;
    },
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<void> {
    const { email, password, username } = data;
    const { ip, userAgent, device } = meta;

    this.logger.log(
      `Registration attempt for email: ${email}, username: ${username}`,
      'RegistrationService',
    );

    const { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } = AUTH_CONFIG.RATE_LIMIT;
    const { VERIFICATION } = AUTH_CONFIG.TOKEN_EXPIRY;

    // 1. Check rate limiting
    await Promise.all([
      this.authUtilsService.checkRateLimit(
        `register:email:${email}`,
        LOGIN_MAX_ATTEMPTS,
        LOGIN_WINDOW_MS,
      ),
      this.authUtilsService.checkRateLimit(
        `register:ip:${ip}`,
        LOGIN_MAX_ATTEMPTS,
        LOGIN_WINDOW_MS,
      ),
    ]);

    // 2. Validate password strength
    if (!this.authUtilsService.validatePassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    // 3. Check if user already exists
    const existsByEmail = await this.userRepository.existsByEmail(email);
    if (existsByEmail) {
      this.logger.warn(
        `Registration failed: Email already exists - ${email}`,
        'RegistrationService',
      );
      throw new UserAlreadyExistsException(email);
    }

    const existsByUsername =
      await this.userRepository.existsByUsername(username);
    if (existsByUsername) {
      this.logger.warn(
        `Registration failed: Username already exists - ${username}`,
        'RegistrationService',
      );
      throw new UserAlreadyExistsException(username);
    }

    // 4. Generate verification code
    const verificationCode = this.authUtilsService.generateVerificationCode();
    const expiresAt = new Date(
      Date.now() + this.parseExpiryToSeconds(VERIFICATION) * 1000,
    );

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 6. Create user domain model
    const user = User.create({
      id: this.generateId(),
      email,
      username,
      passwordHash: hashedPassword,
    });

    // 7. Save user to database
    await this.userRepository.save(user);

    // 8. Store verification code in Redis
    const verificationKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION_TOKEN}:${email}`;
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    await this.redisService.set(
      verificationKey,
      {
        code: verificationCode,
        userId: user.id,
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      },
      ttlSeconds,
    );

    // 9. Queue verification email
    try {
      await this.emailQueueService.sendVerificationEmail(
        email,
        username,
        verificationCode,
        user.id,
      );
      this.logger.log(
        `User registered successfully: ${email}, verification email queued`,
        'RegistrationService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue verification email for ${email}`,
        error instanceof Error ? error.stack : undefined,
        'RegistrationService',
      );
      throw new Error('Failed to send verification email');
    }

    // 10. Log activity
    await this.activityLogService.logCreate(
      'authUser',
      user.id,
      {
        email,
        username,
        role: 'USER',
        status: 'ACTIVE',
        verified: 'false',
        provider: 'local',
      },
      { ip, userAgent, actionedBy: user.id, device },
    );
  }

  /**
   * Verify user email with verification code
   */
  async verifyEmail(
    email: string,
    code: string,
    meta: { ip: string; userAgent: string },
  ): Promise<{ message: string }> {
    const { ip, userAgent } = meta;

    this.logger.log(
      `Email verification attempt for: ${email}`,
      'RegistrationService',
    );

    const verificationKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION_TOKEN}:${email}`;

    // 1. Get verification data from Redis
    const verificationData = await this.redisService.get<{
      code: string;
      userId: string;
      email: string;
      expiresAt: string;
    }>(verificationKey);

    if (!verificationData) {
      this.logger.warn(
        `Verification failed: Code expired or invalid for ${email}`,
        'RegistrationService',
      );
      throw new InvalidVerificationCodeException();
    }

    // 2. Validate code
    if (verificationData.code !== code) {
      this.logger.warn(
        `Verification failed: Invalid code for ${email}`,
        'RegistrationService',
      );
      throw new InvalidVerificationCodeException();
    }

    // 3. Get user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // 4. Check if already verified
    if (user.verified) {
      throw new EmailAlreadyVerifiedException();
    }

    // 5. Verify email (business logic in domain model)
    user.verifyEmail();

    // 6. Save updated user
    await this.userRepository.save(user);

    // 7. Delete verification code from Redis
    await this.redisService.del(verificationKey);

    // 8. Queue welcome email
    try {
      await this.emailQueueService.sendWelcomeEmail(
        email,
        user.username,
        user.id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue welcome email for ${email}`,
        error instanceof Error ? error.stack : undefined,
        'RegistrationService',
      );
    }

    // 9. Log activity
    await this.activityLogService.logCustomEvent(
      'authUser',
      user.id,
      'profile_update',
      { ip, userAgent, actionedBy: user.id },
      [
        {
          fieldName: 'verified',
          oldValue: 'false',
          newValue: 'true',
        },
      ],
    );

    this.logger.log(
      `Email verified successfully for: ${email}`,
      'RegistrationService',
    );

    return { message: 'Email verified successfully' };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(
    email: string,
    meta: { ip: string; userAgent: string },
  ): Promise<{ message: string }> {
    const { ip, userAgent } = meta;

    this.logger.log(
      `Resend verification email for: ${email}`,
      'RegistrationService',
    );

    const { VERIFICATION } = AUTH_CONFIG.TOKEN_EXPIRY;

    // 1. Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // 2. Check if already verified
    if (user.verified) {
      throw new EmailAlreadyVerifiedException();
    }

    // 3. Generate new verification code
    const verificationCode = this.authUtilsService.generateVerificationCode();
    const expiresAt = new Date(
      Date.now() + this.parseExpiryToSeconds(VERIFICATION) * 1000,
    );

    // 4. Store in Redis
    const verificationKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.VERIFICATION_TOKEN}:${email}`;
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);

    await this.redisService.set(
      verificationKey,
      {
        code: verificationCode,
        userId: user.id,
        email: user.email,
        expiresAt: expiresAt.toISOString(),
      },
      ttlSeconds,
    );

    // 5. Queue verification email
    try {
      await this.emailQueueService.sendVerificationEmail(
        email,
        user.username,
        verificationCode,
        user.id,
      );
      this.logger.log(
        `Verification email resent successfully for: ${email}`,
        'RegistrationService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue verification email for ${email}`,
        error instanceof Error ? error.stack : undefined,
        'RegistrationService',
      );
      throw new Error('Failed to send verification email');
    }

    return { message: 'Verification email sent successfully' };
  }

  // ==================== PRIVATE HELPER METHODS ====================

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return value;
    }
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}
