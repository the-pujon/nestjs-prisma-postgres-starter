/**
 * Authentication Configuration Constants
 */

export const AUTH_CONFIG = {
  // Password Configuration
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    UPPERCASE: true,
    LOWERCASE: true,
    NUMBERS: true,
    SPECIAL_CHARS: true,
  },

  // Token Configuration
  TOKEN_EXPIRY: {
    ACCESS: '15m', // Short-lived for security (was 1h)
    REFRESH: '7d',
    VERIFICATION: '24h',
    PASSWORD_RESET: '1h',
  },

  // Rate Limiting (removed user-agent to prevent Redis key explosion)
  RATE_LIMIT: {
    LOGIN_MAX_ATTEMPTS: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    PASSWORD_RESET_MAX_ATTEMPTS: 3,
    PASSWORD_RESET_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  },

  // Account Lockout
  ACCOUNT_LOCKOUT: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes
  },

  // Session/Device Management
  SESSION: {
    MAX_DEVICES_PER_USER: 5, // Max concurrent refresh tokens per user
  },

  // Role Hierarchy (higher number = more permissions)
  ROLE_HIERARCHY: {
    CUSTOMER: 1,
    MODERATOR: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  },

  // Cache Prefixes (improved naming convention)
  CACHE_PREFIXES: {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh:user', // refresh:user:{userId}:{jti}
    USER_SESSIONS: 'sessions:user', // sessions:user:{userId}
    RATE_LIMIT: 'rate_limit:',
    VERIFICATION_TOKEN: 'verification_token',
    PASSWORD_RESET_TOKEN: 'password_reset_token',
    TOKEN_BLACKLIST: 'token_blacklist',
  },
} as const;
