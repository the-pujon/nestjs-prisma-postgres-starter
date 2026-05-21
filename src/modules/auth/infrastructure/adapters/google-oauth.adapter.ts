import { Injectable } from '@nestjs/common';
import { GoogleOAuthService } from '../../services/google-oauth.service';
import { IGoogleOAuthLoginResponse } from '../../interfaces/google-oauth.interface';

/**
 * Google OAuth Adapter
 *
 * Adapts the external Google OAuth service to work with clean architecture.
 * This is an adapter pattern implementation that bridges the gap between
 * the infrastructure layer and external services.
 *
 * Purpose:
 * - Provides a clean interface for Google OAuth operations
 * - Decouples business logic from external OAuth implementation
 * - Makes it easier to swap OAuth providers or change implementation
 *
 * Pattern: Adapter Pattern (Infrastructure Layer)
 *
 * Note: Currently wraps the existing GoogleOAuthService.
 * In the future, this could be refactored to directly implement OAuth
 * without depending on the legacy service.
 */
@Injectable()
export class GoogleOAuthAdapter {
  constructor(private readonly googleOAuthService: GoogleOAuthService) {}

  /**
   * Initialize OAuth flow
   * Generates authorization URL with PKCE
   */
  async initOAuth(meta: {
    ip: string;
    userAgent: string;
    device?: string;
  }): Promise<{ authorizationUrl: string; state: string }> {
    const result = await this.googleOAuthService.getAuthorizationUrl(meta);
    return { authorizationUrl: result.url, state: result.state };
  }

  /**
   * Handle OAuth callback
   * Exchanges authorization code for tokens and user info
   */
  async handleCallback(
    state: string,
    code: string,
    meta: {
      ip: string;
      userAgent: string;
      device?: string;
    },
  ): Promise<IGoogleOAuthLoginResponse> {
    return this.googleOAuthService.handleCallback(state, code, meta);
  }

  /**
   * Refresh OAuth tokens
   */
  refreshOAuthToken(
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Delegate to the existing service
    // In a full refactor, this logic would be moved here
    throw new Error('OAuth token refresh not yet implemented in adapter');
  }

  /**
   * Revoke OAuth access
   */
  async revokeOAuthAccess(userId: string): Promise<void> {
    // Delegate to the existing service
    // In a full refactor, this logic would be moved here
    throw new Error('OAuth revocation not yet implemented in adapter');
  }

  /**
   * Get OAuth user info
   */
  async getUserInfo(accessToken: string): Promise<any> {
    // Delegate to the existing service
    // In a full refactor, this logic would be moved here
    throw new Error('Get user info not yet implemented in adapter');
  }
}
