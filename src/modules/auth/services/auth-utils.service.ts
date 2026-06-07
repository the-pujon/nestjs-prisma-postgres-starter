import { Injectable } from '@nestjs/common';
import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import httpStatus from 'http-status';
import config from '../../../shared/config/app.config';
import {
  IAccessTokenPayload,
  IRefreshTokenPayload,
  ITokenPayload,
  UserRole,
} from '../interfaces/auth.interface';
import { AUTH_CONFIG } from '../config/auth.config';
import { RedisService } from '../../../shared/infrastructure/cache/redis.service';
import AppError from '../../../shared/infrastructure/errors/app.error';
import crypto from 'crypto';

interface TokenOptions {
  isRefresh?: boolean;
  expiresIn?: SignOptions['expiresIn'];
}

/**
 * Authentication Utility Service
 * Provides various authentication-related utilities
 */
@Injectable()
export class AuthUtilsService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Generates a cryptographically secure random ID
   * Used for JTI (JWT ID) to prevent collisions
   */
  generateSecureId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generates a random verification code
   */
  generateVerificationCode = (): string => {
    return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
  };

  /**
   * Hash a token using SHA-256 for secure storage
   * Never store raw tokens - only hashes
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Creates an access token (stateless, minimal payload)
   */
  createAccessToken(
    payload: IAccessTokenPayload,
    expiresIn?: SignOptions['expiresIn'],
  ): string {
    const secret = config.jwt_access_secret;
    if (!secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'JWT access secret is not configured',
      );
    }

    const signOptions: SignOptions = {
      expiresIn: expiresIn || AUTH_CONFIG.TOKEN_EXPIRY.ACCESS,
      algorithm: 'HS256',
    };

    return jwt.sign(payload, secret, signOptions);
  }

  /**
   * Creates a refresh token with JTI for revocation capability
   */
  createRefreshToken(
    payload: IRefreshTokenPayload,
    jti: string,
    expiresIn?: SignOptions['expiresIn'],
  ): string {
    const secret = config.jwt_refresh_secret;
    if (!secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'JWT refresh secret is not configured',
      );
    }

    const signOptions: SignOptions = {
      expiresIn: expiresIn || AUTH_CONFIG.TOKEN_EXPIRY.REFRESH,
      algorithm: 'HS256',
      jwtid: jti, // Embed JTI in JWT standard claim
    };

    return jwt.sign(payload, secret, signOptions);
  }

  /**
   * @deprecated Use createAccessToken or createRefreshToken
   * Creates a JWT token with proper options
   */
  createToken(payload: ITokenPayload, options: TokenOptions = {}): string {
    const { isRefresh = false, expiresIn } = options;
    const secret = isRefresh
      ? config.jwt_refresh_secret
      : config.jwt_access_secret;
    const defaultExpiry = isRefresh ? '7d' : '1h';

    const signOptions: SignOptions = {
      expiresIn: expiresIn || defaultExpiry,
      algorithm: 'HS256',
    };

    if (!secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'JWT secret is not configured',
      );
    }

    return jwt.sign(payload, secret, signOptions);
  }

  /**
   * Verifies an access token
   */
  verifyAccessToken(token: string): IAccessTokenPayload & JwtPayload {
    const secret = config.jwt_access_secret;
    if (!secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'JWT access secret is not configured',
      );
    }
    return jwt.verify(token, secret) as IAccessTokenPayload & JwtPayload;
  }

  /**
   * Verifies a refresh token and returns payload with JTI
   */
  verifyRefreshToken(token: string): IRefreshTokenPayload & JwtPayload {
    const secret = config.jwt_refresh_secret;
    if (!secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'JWT refresh secret is not configured',
      );
    }
    return jwt.verify(token, secret) as IRefreshTokenPayload & JwtPayload;
  }

  /**
   * @deprecated Use verifyAccessToken or verifyRefreshToken
   * Verifies a JWT token
   */
  verifyToken(token: string): JwtPayload {
    const secret = config.jwt_access_secret;
    if (!secret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'JWT secret is not configured',
      );
    }
    return jwt.verify(token, secret) as JwtPayload;
  }

  /**
   * Removes user tokens from cache and cookies
   */
  async removeTokens(
    res: Response,
    prefix: string,
    email: string,
  ): Promise<void> {
    const accessTokenKey = `${prefix}:user:${email}:accessToken`;
    const refreshTokenKey = `${prefix}:user:${email}:refreshToken`;

    await Promise.all([
      this.redisService.del(accessTokenKey),
      this.redisService.del(refreshTokenKey),
    ]);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }

  /**
   * Checks rate limiting for operations
   */
  async checkRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number,
  ): Promise<boolean> {
    const cacheKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.RATE_LIMIT}${key}`;
    const lockKey = `${cacheKey}:locked`;

    // First check if we're in a locked state
    const isLocked = await this.redisService.exists(lockKey);
    if (isLocked) {
      throw new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        `Rate limit exceeded. Please try again after ${windowMs / 1000} seconds.`,
      );
    }

    // Use Redis INCR to atomically increment the counter
    const currentAttempts = await this.redisService.incr(cacheKey);

    // Set expiry on first attempt
    if (currentAttempts === 1) {
      await this.redisService.expire(cacheKey, windowMs / 1000);
    }

    if (currentAttempts && currentAttempts > maxAttempts) {
      // Set a lock with TTL instead of continuing to increment
      await this.redisService.set(lockKey, '1', windowMs / 1000);
      throw new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        `Rate limit exceeded. Please try again after ${windowMs / 1000} seconds.`,
      );
    }

    return true;
  }

  /**
   * Validates password strength
   */
  validatePassword(password: string): boolean {
    const { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS } = AUTH_CONFIG;

    if (password.length < PASSWORD_MIN_LENGTH) {
      return false;
    }

    if (PASSWORD_REQUIREMENTS.UPPERCASE && !/[A-Z]/.test(password)) {
      return false;
    }

    if (PASSWORD_REQUIREMENTS.LOWERCASE && !/[a-z]/.test(password)) {
      return false;
    }

    if (PASSWORD_REQUIREMENTS.NUMBERS && !/\d/.test(password)) {
      return false;
    }

    if (
      PASSWORD_REQUIREMENTS.SPECIAL_CHARS &&
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Checks if a user can modify another user's role based on role hierarchy
   */
  canModifyRole(
    currentUserRole: UserRole,
    targetUserRole: UserRole,
    newRole: UserRole,
  ): boolean {
    const { ROLE_HIERARCHY } = AUTH_CONFIG;

    // Super admin can modify any role except other super admins
    if (currentUserRole === UserRole.SUPER_ADMIN) {
      return (
        targetUserRole !== UserRole.SUPER_ADMIN &&
        newRole !== UserRole.SUPER_ADMIN
      );
    }

    // Admin can only modify moderator and customer roles
    if (currentUserRole === UserRole.ADMIN) {
      const targetRoleLevel =
        ROLE_HIERARCHY[targetUserRole as keyof typeof ROLE_HIERARCHY] || 0;
      const newRoleLevel =
        ROLE_HIERARCHY[newRole as keyof typeof ROLE_HIERARCHY] || 0;
      const adminLevel = ROLE_HIERARCHY[UserRole.ADMIN];

      return targetRoleLevel < adminLevel && newRoleLevel < adminLevel;
    }

    // Moderator can only modify customer roles
    if (currentUserRole === UserRole.MODERATOR) {
      return (
        targetUserRole === UserRole.CUSTOMER && newRole === UserRole.CUSTOMER
      );
    }

    // Customer cannot modify any roles
    if (currentUserRole === UserRole.CUSTOMER) {
      return false;
    }

    return false;
  }
}
