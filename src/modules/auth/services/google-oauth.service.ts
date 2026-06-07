import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { CustomLoggerService } from '../../../shared/infrastructure/logging/logger.service';
import { RedisService } from '../../../shared/infrastructure/cache/redis.service';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { ActivityLogService } from '../../../shared/infrastructure/services/activity-log.service';
import { AuthUtilsService } from './auth-utils.service';
import {
  GOOGLE_OAUTH_CONFIG,
  getGoogleOAuthCredentials,
} from '../config/google-oauth.config';
import { AUTH_CONFIG } from '../config/auth.config';
import {
  IGoogleTokenResponse,
  IGoogleUserInfo,
  IGoogleOAuthState,
  IGoogleOAuthLoginResponse,
  IGoogleIdTokenClaims,
} from '../interfaces/google-oauth.interface';
import { IStoredRefreshToken, UserRole } from '../interfaces/auth.interface';
import AppError from '../../../shared/infrastructure/errors/app.error';
import config from '../../../shared/config/app.config';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Google OAuth Service
 * Implements Google OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 */
@Injectable()
export class GoogleOAuthService {
  private readonly context = 'GoogleOAuthService';
  private readonly jwksClient: JwksClient;

  constructor(
    private readonly customLogger: CustomLoggerService,
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly authUtilsService: AuthUtilsService,
  ) {
    // Initialize JWKS client for Google public key retrieval
    // Keys are cached and automatically rotated
    this.jwksClient = new JwksClient({
      jwksUri: GOOGLE_OAUTH_CONFIG.ENDPOINTS.JWKS,
      cache: true,
      cacheMaxAge: 86400000, // 24 hours
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Generate a cryptographically secure random state token
   * Used to prevent CSRF attacks
   */
  private generateStateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate PKCE code verifier
   * A high-entropy cryptographic random string using unreserved characters
   * RFC 7636 compliant (43-128 characters)
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   * SHA256 hash of the code verifier, base64url encoded
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * Generate a unique username from Google profile
   */
  private generateUsername(googleUser: IGoogleUserInfo): string {
    const baseName =
      googleUser.given_name || googleUser.name?.split(' ')[0] || 'user';
    const sanitized = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    return `${sanitized}_${uniqueSuffix}`;
  }

  /**
   * Get Google's public signing key for ID token verification
   * Keys are cached and automatically rotated by JWKS client
   */
  private async getGooglePublicKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.customLogger.error(
        `Failed to fetch Google public key: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
        this.context,
      );
      throw AppError.unauthorized('Failed to verify ID token signature');
    }
  }

  /**
   * Verify and decode Google ID token with signature verification
   * Production-ready implementation using Google's public keys (JWKS)
   *
   * This ensures:
   * 1. The token was actually signed by Google (not forged)
   * 2. The token hasn't been tampered with
   * 3. The token is for our application (audience check)
   * 4. The token hasn't expired
   * 5. The token is from the correct issuer (Google)
   */
  private async verifyIdToken(idToken: string): Promise<IGoogleIdTokenClaims> {
    try {
      const { clientId } = getGoogleOAuthCredentials();

      // Decode header to get 'kid' (Key ID) - which public key to use
      const decoded = jwt.decode(idToken, { complete: true });

      if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        throw new Error('Invalid token format or missing kid');
      }

      // Fetch Google's public key using the kid from token header
      const publicKey = await this.getGooglePublicKey(decoded.header.kid);

      // Verify signature and validate claims in one step
      const payload = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'], // Google uses RS256 (RSA with SHA-256)
        issuer: ['accounts.google.com', 'https://accounts.google.com'],
        audience: clientId, // Ensures token is for our app
        clockTolerance: 60, // Allow 60 seconds clock skew
      }) as IGoogleIdTokenClaims;

      // Additional validation for email verification
      if (!payload.email_verified) {
        throw new Error('Email not verified by Google');
      }

      this.customLogger.log(
        `ID token verified successfully for: ${payload.email}`,
        this.context,
      );

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        this.customLogger.warn('ID token expired', this.context);
        throw AppError.unauthorized('ID token has expired');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        this.customLogger.warn(
          `Invalid ID token: ${error.message}`,
          this.context,
        );
        throw AppError.unauthorized('Invalid ID token signature');
      }

      this.customLogger.error(
        'Failed to verify ID token',
        error instanceof Error ? error.stack : undefined,
        this.context,
      );
      throw AppError.unauthorized('Failed to verify ID token');
    }
  }

  /**
   * Generate Google OAuth authorization URL
   * Implements PKCE for enhanced security
   */
  async getAuthorizationUrl(
    meta: { ip: string; userAgent: string },
    redirectUrl?: string,
  ): Promise<{ url: string; state: string }> {
    const { clientId, redirectUri } = getGoogleOAuthCredentials();

    // Generate state and PKCE parameters
    const state = this.generateStateToken();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Store state and code verifier in Redis for validation
    const stateData: IGoogleOAuthState = {
      state,
      codeVerifier,
      redirectUrl,
      ip: meta.ip,
      userAgent: meta.userAgent,
      createdAt: new Date().toISOString(),
    };

    const stateKey = `${config.redis_cache_key_prefix}:${GOOGLE_OAUTH_CONFIG.STATE.CACHE_PREFIX}:${state}`;
    await this.redisService.set(
      stateKey,
      stateData,
      GOOGLE_OAUTH_CONFIG.STATE.TTL_SECONDS,
    );

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: GOOGLE_OAUTH_CONFIG.RESPONSE_TYPE,
      scope: GOOGLE_OAUTH_CONFIG.SCOPES.join(' '),
      access_type: GOOGLE_OAUTH_CONFIG.ACCESS_TYPE,
      prompt: GOOGLE_OAUTH_CONFIG.PROMPT,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${GOOGLE_OAUTH_CONFIG.ENDPOINTS.AUTHORIZATION}?${params.toString()}`;

    this.customLogger.log(
      `Generated Google OAuth authorization URL for IP: ${meta.ip}`,
      this.context,
    );

    return { url: authUrl, state };
  }

  /**
   * Exchange authorization code for tokens
   * Uses PKCE code verifier for validation
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<IGoogleTokenResponse> {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthCredentials();

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: GOOGLE_OAUTH_CONFIG.GRANT_TYPES.AUTHORIZATION_CODE,
      redirect_uri: redirectUri,
    });

    const response = await fetch(GOOGLE_OAUTH_CONFIG.ENDPOINTS.TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.customLogger.error(
        `Failed to exchange code for tokens: ${JSON.stringify(errorData)}`,
        undefined,
        this.context,
      );
      throw AppError.unauthorized('Failed to authenticate with Google');
    }

    return response.json() as Promise<IGoogleTokenResponse>;
  }

  /**
   * Fetch user info from Google using access token
   */
  private async getUserInfo(accessToken: string): Promise<IGoogleUserInfo> {
    const response = await fetch(GOOGLE_OAUTH_CONFIG.ENDPOINTS.USERINFO, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      this.customLogger.error(
        `Failed to fetch user info: ${JSON.stringify(errorData)}`,
        undefined,
        this.context,
      );
      throw AppError.unauthorized('Failed to get user information from Google');
    }

    return response.json() as Promise<IGoogleUserInfo>;
  }

  /**
   * Handle Google OAuth callback
   * Validates state, exchanges code for tokens, and creates/updates user
   */
  async handleCallback(
    code: string,
    state: string,
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<IGoogleOAuthLoginResponse> {
    const { ip, userAgent, device } = meta;

    // Validate state parameter
    const stateKey = `${config.redis_cache_key_prefix}:${GOOGLE_OAUTH_CONFIG.STATE.CACHE_PREFIX}:${state}`;
    const stateData = await this.redisService.get<IGoogleOAuthState>(stateKey);

    if (!stateData) {
      this.customLogger.warn(
        `Invalid or expired OAuth state: ${state}`,
        this.context,
      );
      throw AppError.badRequest(
        'Invalid or expired OAuth state. Please try again.',
      );
    }

    // Delete state from Redis (single-use)
    await this.redisService.del(stateKey);

    // Validate state matches
    if (stateData.state !== state) {
      this.customLogger.warn('OAuth state mismatch', this.context);
      throw AppError.badRequest('Invalid OAuth state');
    }

    // Exchange code for tokens using PKCE
    const tokenResponse = await this.exchangeCodeForTokens(
      code,
      stateData.codeVerifier,
    );

    // Extract user info from ID token with signature verification (most secure)
    let googleUser: IGoogleUserInfo | null = null;

    if (tokenResponse.id_token) {
      try {
        // Verify token signature using Google's public keys
        const idTokenClaims = await this.verifyIdToken(tokenResponse.id_token);
        googleUser = {
          sub: idTokenClaims.sub,
          email: idTokenClaims.email,
          email_verified: idTokenClaims.email_verified,
          name: idTokenClaims.name || '',
          given_name: idTokenClaims.given_name,
          family_name: idTokenClaims.family_name,
          picture: idTokenClaims.picture,
        };
      } catch (error) {
        // Signature verification failed - do NOT fallback to userinfo
        // This is a security violation
        this.customLogger.error(
          'ID token verification failed - possible forgery attempt',
          error instanceof Error ? error.stack : undefined,
          this.context,
        );
        throw AppError.unauthorized(
          'Failed to verify ID token. Please try again.',
        );
      }
    } else {
      // No ID token provided, fallback to userinfo endpoint
      googleUser = await this.getUserInfo(tokenResponse.access_token);
    }

    // Validate email is verified
    if (!googleUser.email_verified) {
      this.customLogger.warn(
        `Google user email not verified: ${googleUser.email}`,
        this.context,
      );
      throw AppError.forbidden(
        'Please verify your Google email address before signing in.',
      );
    }

    // Find or create user
    const result = await this.findOrCreateUser(googleUser, {
      ip,
      userAgent,
      device,
    });

    this.customLogger.log(
      `Google OAuth ${result.isNewUser ? 'sign-up' : 'sign-in'} successful for: ${googleUser.email}`,
      this.context,
    );

    // Include redirectUrl from state if it exists
    return {
      ...result,
      redirectUrl: stateData.redirectUrl,
    };
  }

  /**
   * Find existing user or create new one from Google profile
   */
  private async findOrCreateUser(
    googleUser: IGoogleUserInfo,
    meta: { ip: string; userAgent: string; device?: string },
  ): Promise<IGoogleOAuthLoginResponse> {
    const { ip, userAgent, device } = meta;

    // Check if user exists by provider ID (Google's sub)
    let user = await this.prismaService.authUser.findFirst({
      where: {
        provider: 'google',
        providerId: googleUser.sub,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        verified: true,
        status: true,
        provider: true,
        providerId: true,
        tokenVersion: true,
      },
    });

    let isNewUser = false;

    if (!user) {
      // Check if user exists with same email but different provider
      const existingUserWithEmail =
        await this.prismaService.authUser.findUnique({
          where: { email: googleUser.email },
        });

      if (existingUserWithEmail) {
        // Link Google account to existing user
        if (existingUserWithEmail.provider === 'local') {
          this.customLogger.warn(
            `Email ${googleUser.email} already registered with local provider`,
            this.context,
          );
          throw AppError.conflict(
            'An account with this email already exists. Please sign in with your email and password, then link your Google account in settings.',
          );
        } else {
          throw AppError.conflict(
            `This email is already associated with a ${existingUserWithEmail.provider} account.`,
          );
        }
      }

      // Create new user
      const username = this.generateUsername(googleUser);

      user = await this.prismaService.$transaction(async (tx) => {
        // Create auth user
        const newUser = await tx.authUser.create({
          data: {
            email: googleUser.email,
            username,
            password: '', // OAuth users don't have a password
            role: 'USER',
            verified: true, // Google verified the email
            status: 'ACTIVE',
            provider: 'google',
            providerId: googleUser.sub,
          },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            verified: true,
            status: true,
            provider: true,
            providerId: true,
            tokenVersion: true,
          },
        });

        // Create auth security record
        await tx.authSecurity.create({
          data: {
            authId: newUser.id,
            failedAttempts: 0,
            mfaEnabled: false,
          },
        });

        // Create user profile with Google data
        await tx.userProfile.create({
          data: {
            authId: newUser.id,
            firstName:
              googleUser.given_name || googleUser.name?.split(' ')[0] || '',
            lastName: googleUser.family_name || '',
            avatarUrl: googleUser.picture || null,
          },
        });

        // Log user registration activity
        await this.activityLogService.logCreate(
          'authUser',
          newUser.id,
          {
            email: googleUser.email,
            username,
            role: 'USER',
            status: 'ACTIVE',
            verified: 'true',
            provider: 'google',
          },
          { ip, userAgent, actionedBy: newUser.id, device },
          tx,
        );

        return newUser;
      });

      isNewUser = true;

      this.customLogger.log(
        `New user created via Google OAuth: ${googleUser.email}`,
        this.context,
      );
    } else {
      // Check account status
      if (user.status === 'BLOCKED' || user.status === 'SUSPENDED') {
        throw AppError.forbidden(
          `Your account has been ${user.status.toLowerCase()}. Please contact support.`,
        );
      }

      if (user.status === 'DELETED' || user.status === 'INACTIVE') {
        throw AppError.unauthorized('Invalid credentials');
      }
    }

    // Generate tokens
    return this.generateTokensForUser(
      user,
      { ip, userAgent, device },
      isNewUser,
    );
  }

  /**
   * Generate access and refresh tokens for authenticated user
   */
  private async generateTokensForUser(
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      tokenVersion: number;
      verified: boolean;
      provider: string;
      providerId: string | null;
    },
    meta: { ip: string; userAgent: string; device?: string },
    isNewUser: boolean,
  ): Promise<IGoogleOAuthLoginResponse> {
    const { ip, userAgent, device } = meta;

    // Distributed lock to prevent concurrent login race conditions
    const lockKey = `${config.redis_cache_key_prefix}:lock:login:${user.id}`;
    const lockAcquired = await this.redisService.setNX(lockKey, '1', 5);

    if (!lockAcquired) {
      throw AppError.conflict(
        'Another login is in progress. Please try again in a moment.',
      );
    }

    try {
      // Generate JTI
      const jti = this.authUtilsService.generateSecureId();

      // Create access token
      const accessToken = this.authUtilsService.createAccessToken({
        userId: user.id,
        role: user.role as unknown as UserRole,
        tokenVersion: user.tokenVersion, // Include tokenVersion for hybrid JWT validation
      });

      // Create refresh token with JTI
      const refreshToken = this.authUtilsService.createRefreshToken(
        { userId: user.id },
        jti,
      );

      // Hash the refresh token for storage
      const tokenHash = this.authUtilsService.hashToken(refreshToken);

      // Calculate TTL
      const refreshTokenTTL = this.parseExpiryToSeconds(
        AUTH_CONFIG.TOKEN_EXPIRY.REFRESH,
      );

      // Store refresh token in Redis
      const refreshTokenKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.REFRESH_TOKEN}:${user.id}:${jti}`;

      const storedTokenData: IStoredRefreshToken = {
        userId: user.id,
        jti,
        tokenHash,
        ip,
        userAgent,
        device,
        createdAt: new Date().toISOString(),
      };

      await this.redisService.set(
        refreshTokenKey,
        storedTokenData,
        refreshTokenTTL,
      );

      // Track session
      await this.addUserSession(user.id, jti, refreshTokenTTL);

      // Enforce max devices
      await this.enforceMaxDevices(
        user.id,
        AUTH_CONFIG.SESSION.MAX_DEVICES_PER_USER,
      ).catch((error) => {
        this.customLogger.warn(
          `Failed to enforce max devices: ${error instanceof Error ? error.message : String(error)}`,
          this.context,
        );
      });

      // Log login attempt (fire-and-forget)
      void this.logLoginAttempt({
        authId: user.id,
        ip,
        userAgent,
        device,
        success: true,
        provider: 'google',
      });

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          verified: user.verified,
          provider: user.provider,
          providerId: user.providerId || '',
        },
        expiresIn: this.parseExpiryToSeconds(AUTH_CONFIG.TOKEN_EXPIRY.ACCESS),
        isNewUser,
      };
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  /**
   * Add session to user's session list
   */
  private async addUserSession(
    userId: string,
    jti: string,
    ttl: number,
  ): Promise<void> {
    const sessionKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.USER_SESSIONS}:${userId}`;
    const sessions = (await this.redisService.get<string[]>(sessionKey)) || [];

    if (!sessions.includes(jti)) {
      sessions.push(jti);
    }

    await this.redisService.set(sessionKey, sessions, ttl);
  }

  /**
   * Enforce maximum number of devices per user
   */
  private async enforceMaxDevices(
    userId: string,
    maxDevices: number,
  ): Promise<void> {
    const sessionKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.USER_SESSIONS}:${userId}`;
    const sessions = (await this.redisService.get<string[]>(sessionKey)) || [];

    if (sessions.length > maxDevices) {
      // Remove oldest sessions
      const sessionsToRemove = sessions.slice(0, sessions.length - maxDevices);

      for (const jti of sessionsToRemove) {
        const tokenKey = `${config.redis_cache_key_prefix}:${AUTH_CONFIG.CACHE_PREFIXES.REFRESH_TOKEN}:${userId}:${jti}`;
        await this.redisService.del(tokenKey);
      }

      // Update session list
      const remainingSessions = sessions.slice(sessions.length - maxDevices);
      await this.redisService.set(sessionKey, remainingSessions);
    }
  }

  /**
   * Log login attempt to database
   */
  private async logLoginAttempt(data: {
    authId: string;
    ip: string;
    userAgent: string;
    device?: string;
    success: boolean;
    failureReason?: string;
    provider?: string;
  }): Promise<void> {
    try {
      await this.prismaService.loginHistory.create({
        data: {
          authId: data.authId,
          ipAddress: data.ip,
          userAgent: data.userAgent,
          device_id: data.device,
          action: 'login',
          success: data.success,
          failureReason: data.failureReason,
        },
      });
    } catch (error) {
      this.customLogger.error(
        `Failed to log login attempt: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        this.context,
      );
    }
  }

  /**
   * Revoke Google OAuth token (for logout)
   */
  async revokeGoogleToken(token: string): Promise<void> {
    try {
      const response = await fetch(
        `${GOOGLE_OAUTH_CONFIG.ENDPOINTS.REVOKE}?token=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (!response.ok) {
        this.customLogger.warn('Failed to revoke Google token', this.context);
      }
    } catch (error) {
      this.customLogger.error(
        `Error revoking Google token: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        this.context,
      );
    }
  }
}
