/**
 * Authentication-related interfaces and types
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

/**
 * Access token payload - minimal for stateless auth
 * tokenVersion enables immediate revocation without full DB lookup
 */
export interface IAccessTokenPayload {
  userId: string;
  role: UserRole;
  tokenVersion: number; // Incremented on security events (block, password change, etc.)
  iat?: number;
  exp?: number;
}

/**
 * Refresh token payload - minimal data
 * JTI is set via JWT standard claims, not in payload
 */
export interface IRefreshTokenPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * @deprecated Use IAccessTokenPayload or IRefreshTokenPayload
 */
export interface ITokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti?: string;
  iat?: number;
  exp?: number;
}

/**
 * Stored refresh token data in Redis
 */
export interface IStoredRefreshToken {
  userId: string;
  jti: string;
  tokenHash: string; // SHA-256 hash of the actual token
  ip: string;
  userAgent: string;
  device?: string;
  createdAt: string;
  rotatedFrom?: string; // JTI of the token this was rotated from
}

/**
 * Login response structure
 */
export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    verified: boolean;
  };
  expiresIn: number;
}
