/**
 * Google OAuth Configuration
 * Industry-standard configuration for Google OAuth 2.0
 */

export const GOOGLE_OAUTH_CONFIG = {
  // OAuth 2.0 Endpoints
  ENDPOINTS: {
    AUTHORIZATION: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN: 'https://oauth2.googleapis.com/token',
    USERINFO: 'https://www.googleapis.com/oauth2/v3/userinfo',
    TOKEN_INFO: 'https://oauth2.googleapis.com/tokeninfo',
    REVOKE: 'https://oauth2.googleapis.com/revoke',
    JWKS: 'https://www.googleapis.com/oauth2/v3/certs',
  },

  // OAuth 2.0 Scopes
  SCOPES: ['openid', 'email', 'profile'],

  // Access type for refresh token
  ACCESS_TYPE: 'offline' as const,

  // Prompt type for consent
  PROMPT: 'consent' as const,

  // Response type for authorization code flow
  RESPONSE_TYPE: 'code' as const,

  // Grant types
  GRANT_TYPES: {
    AUTHORIZATION_CODE: 'authorization_code',
    REFRESH_TOKEN: 'refresh_token',
  },

  // State token configuration
  STATE: {
    TTL_SECONDS: 600, // 10 minutes
    CACHE_PREFIX: 'google_oauth_state',
  },
} as const;

/**
 * Get Google OAuth credentials from environment variables
 */
export const getGoogleOAuthCredentials = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.',
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
  };
};
