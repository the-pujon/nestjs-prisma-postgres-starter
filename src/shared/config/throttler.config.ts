/**
 * Rate Limiting Configuration
 *
 * Uses @nestjs/throttler with Redis storage for distributed rate limiting.
 * This ensures consistent rate limits across multiple app instances.
 */

export const THROTTLER_CONFIG = {
  // Default rate limit (applies to all routes unless overridden)
  DEFAULT: {
    ttl: 60000, // 60 seconds (1 minute)
    limit: 100, // 100 requests per minute
  },

  // Strict rate limit for sensitive endpoints (login, signup, password reset)
  STRICT: {
    ttl: 60000, // 60 seconds
    limit: 10, // 10 requests per minute
  },

  // Very strict for auth attempts (prevents brute force)
  AUTH: {
    ttl: 900000, // 15 minutes
    limit: 5, // 5 attempts per 15 minutes
  },

  // Relaxed for read-heavy endpoints
  RELAXED: {
    ttl: 60000, // 60 seconds
    limit: 300, // 300 requests per minute
  },
} as const;

/**
 * Error messages for rate limiting
 */
export const THROTTLER_MESSAGES = {
  DEFAULT: 'Too many requests. Please try again later.',
  AUTH: 'Too many login attempts. Please try again in 15 minutes.',
  SIGNUP: 'Too many registration attempts. Please try again later.',
} as const;
