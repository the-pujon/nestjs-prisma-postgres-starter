import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { User } from '../../domain/models';
import {
  InvalidTokenException,
  TokenExpiredException,
} from '../../domain/exceptions';
import { AUTH_CONFIG } from '../../config/auth.config';
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  jti: string;
  expiresAt: Date;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  tokenVersion: number;
  type: 'access';
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  jti: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * Token Service
 *
 * Handles JWT token generation, validation, and management.
 *
 * Responsibilities:
 * - Generate access and refresh tokens
 * - Verify and decode tokens
 * - Extract token payload
 *
 * Pattern: Application Service
 */
@Injectable()
export class TokenService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(private readonly logger: CustomLoggerService) {
    this.accessTokenSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.refreshTokenSecret =
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      this.logger.warn(
        'JWT secrets not set in environment variables, using default values (NOT SECURE)',
        'TokenService',
      );
    }
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(user: User): Promise<TokenPair> {
    const { ACCESS, REFRESH } = AUTH_CONFIG.TOKEN_EXPIRY;

    // Generate unique JTI (JWT ID) for the session
    const jti = this.generateJti();

    // Access token payload
    const accessPayload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      type: 'access',
    };

    // Refresh token payload
    const refreshPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      userId: user.id,
      tokenVersion: user.tokenVersion,
      jti,
      type: 'refresh',
    };

    // Generate tokens
    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: ACCESS,
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: REFRESH,
    });

    // Calculate refresh token expiration date
    const expiresAt = new Date(Date.now() + this.parseExpiryToMs(REFRESH));

    return {
      accessToken,
      refreshToken,
      jti,
      expiresAt,
    };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      const payload = jwt.verify(
        token,
        this.accessTokenSecret,
      ) as AccessTokenPayload;

      if (payload.type !== 'access') {
        throw new InvalidTokenException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenException(error.message);
      }
      throw new InvalidTokenException();
    }
  }

  /**
   * Verify and decode refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = jwt.verify(
        token,
        this.refreshTokenSecret,
      ) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new InvalidTokenException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException();
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new InvalidTokenException(error.message);
      }
      throw new InvalidTokenException();
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decode(token: string): any {
    return jwt.decode(token);
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) return null;

    return token;
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Generate unique JWT ID
   */
  private generateJti(): string {
    return `jti_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Parse expiry string to milliseconds
   */
  private parseExpiryToMs(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value * 1000;
    }
  }
}
