import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import {
  IUserRepository,
  USER_REPOSITORY,
  IAuthSessionRepository,
  AUTH_SESSION_REPOSITORY,
} from '../ports';
import { User, AuthSession } from '../../domain/models';
import {
  InvalidCredentialsException,
  AccountLockedException,
  EmailNotVerifiedException,
  SessionNotFoundException,
  SessionExpiredException,
} from '../../domain/exceptions';
import { ActivityLogService } from '../../../../shared/infrastructure/services/activity-log.service';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';
import { AuthUtilsService } from '../../services/auth-utils.service';
import { TokenService } from './token.service';
import { AUTH_CONFIG } from '../../config/auth.config';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    verified: boolean;
  };
}

/**
 * Authentication Service
 *
 * Handles user authentication workflows (login, logout, refresh token).
 *
 * Responsibilities:
 * - User login with credentials
 * - Token refresh
 * - User logout (single device and all devices)
 * - Session management
 *
 * Pattern: Application Service
 */
@Injectable()
export class AuthenticationService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessionRepository: IAuthSessionRepository,
    private readonly tokenService: TokenService,
    private readonly activityLogService: ActivityLogService,
    private readonly authUtilsService: AuthUtilsService,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Authenticate user with email and password
   */
  async login(
    credentials: { email: string; password: string },
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<LoginResponse> {
    const { email, password } = credentials;
    const { ip, userAgent, device } = meta;

    this.logger.log(`Login attempt for: ${email}`, 'AuthenticationService');

    const { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } = AUTH_CONFIG.RATE_LIMIT;
    const { MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS } =
      AUTH_CONFIG.ACCOUNT_LOCKOUT;

    // 1. Check rate limiting
    await Promise.all([
      this.authUtilsService.checkRateLimit(
        `login:email:${email}`,
        LOGIN_MAX_ATTEMPTS,
        LOGIN_WINDOW_MS,
      ),
      this.authUtilsService.checkRateLimit(
        `login:ip:${ip}`,
        LOGIN_MAX_ATTEMPTS,
        LOGIN_WINDOW_MS,
      ),
    ]);

    // 2. Find user with security data
    const user = await this.userRepository.findByEmailWithSecurity(email);

    // Timing attack prevention: always run bcrypt even if user doesn't exist
    const fakePasswordHash =
      '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G4.4.G4.G4.G4.G';

    if (!user) {
      await bcrypt.compare(password, fakePasswordHash);
      this.logger.warn(
        `Login failed: User not found - ${email}`,
        'AuthenticationService',
      );
      throw new InvalidCredentialsException();
    }

    // 3. Check if account is locked
    if (user.isLocked()) {
      this.logger.warn(
        `Login failed: Account locked - ${email}`,
        'AuthenticationService',
      );
      throw new AccountLockedException(user.getLockExpiresAt());
    }

    // 4. Verify password
    if (!user.verifyPassword(password)) {
      // Failed login - increment attempts
      user.incrementFailedAttempts();

      // Check if should lock account
      if (user.shouldLock(MAX_FAILED_ATTEMPTS)) {
        user.lockAccount(LOCKOUT_DURATION_MS);
        this.logger.warn(
          `Account locked due to too many failed attempts - ${email}`,
          'AuthenticationService',
        );
      }

      // Save updated user
      await this.userRepository.save(user);

      // Log failed attempt
      await this.activityLogService.logCustomEvent(
        'authUser',
        user.id,
        'login',
        { ip, userAgent, actionedBy: user.id, device },
        [{ fieldName: 'reason', oldValue: '', newValue: 'invalid_password' }],
      );

      throw new InvalidCredentialsException();
    }

    // 5. Check if email is verified
    if (!user.verified) {
      this.logger.warn(
        `Login failed: Email not verified - ${email}`,
        'AuthenticationService',
      );
      throw new EmailNotVerifiedException();
    }

    // 6. Successful login - reset failed attempts
    user.resetFailedAttempts();
    await this.userRepository.save(user);

    // 7. Generate tokens
    const { accessToken, refreshToken, jti, expiresAt } =
      await this.tokenService.generateTokenPair(user);

    // 8. Create session
    const session = AuthSession.create({
      id: jti,
      authId: user.id,
      refreshToken,
      ip,
      userAgent,
      device: device || undefined,
      expiresAt,
    });

    await this.sessionRepository.save(session);

    // 9. Log successful login
    await this.activityLogService.logCustomEvent(
      'authUser',
      user.id,
      'login',
      { ip, userAgent, actionedBy: user.id, device },
      [],
    );

    this.logger.log(`Login successful for: ${email}`, 'AuthenticationService');

    return {
      accessToken,
      refreshToken,
      user: user.toDTO(),
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshToken: string,
    meta: { ip: string; userAgent: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { ip, userAgent } = meta;

    this.logger.log('Token refresh attempt', 'AuthenticationService');

    // 1. Verify and decode refresh token
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    // 2. Find session
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);
    if (!session) {
      this.logger.warn(
        'Token refresh failed: Session not found',
        'AuthenticationService',
      );
      throw new SessionNotFoundException();
    }

    // 3. Check if session is valid
    const { valid, reason } = session.canBeUsed();
    if (!valid) {
      this.logger.warn(
        `Token refresh failed: ${reason}`,
        'AuthenticationService',
      );
      if (session.isExpired()) {
        throw new SessionExpiredException();
      }
      throw new SessionNotFoundException();
    }

    // 4. Get user
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 5. Verify token version (for token revocation)
    if (payload.tokenVersion !== user.tokenVersion) {
      this.logger.warn(
        'Token refresh failed: Token version mismatch (tokens revoked)',
        'AuthenticationService',
      );
      throw new InvalidCredentialsException();
    }

    // 6. Revoke old session
    session.revoke();
    await this.sessionRepository.save(session);

    // 7. Generate new tokens
    const tokens = await this.tokenService.generateTokenPair(user);

    // 8. Create new session
    const newSession = AuthSession.create({
      id: tokens.jti,
      authId: user.id,
      refreshToken: tokens.refreshToken,
      ip,
      userAgent,
      device: session.device ?? undefined,
      expiresAt: tokens.expiresAt,
    });

    await this.sessionRepository.save(newSession);

    this.logger.log('Token refreshed successfully', 'AuthenticationService');

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Logout user (revoke session)
   */
  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Logout attempt for user: ${userId}`,
      'AuthenticationService',
    );

    // 1. Find session
    const session =
      await this.sessionRepository.findByRefreshToken(refreshToken);
    if (session) {
      // 2. Revoke session
      session.revoke();
      await this.sessionRepository.save(session);
    }

    this.logger.log(
      `Logout successful for user: ${userId}`,
      'AuthenticationService',
    );

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices (revoke all sessions)
   */
  async logoutAllDevices(userId: string): Promise<{ message: string }> {
    this.logger.log(
      `Logout all devices for user: ${userId}`,
      'AuthenticationService',
    );

    // 1. Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 2. Revoke all tokens
    user.revokeAllTokens();
    await this.userRepository.save(user);

    // 3. Revoke all sessions
    await this.sessionRepository.revokeAllUserSessions(userId);

    this.logger.log(
      `All sessions revoked for user: ${userId}`,
      'AuthenticationService',
    );

    return { message: 'Logged out from all devices successfully' };
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string): Promise<any[]> {
    const sessions =
      await this.sessionRepository.findActiveSessionsByUserId(userId);
    return sessions.map((session) => session.toDTO());
  }
}
