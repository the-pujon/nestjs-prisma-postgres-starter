import * as bcrypt from 'bcryptjs';

/**
 * User Domain Model
 *
 * This is a rich domain model that encapsulates business logic related to users.
 * It contains methods that represent user behavior and business rules.
 *
 * Benefits:
 * - Business logic is centralized in one place
 * - Easy to test without database
 * - Protects invariants (e.g., password hashing)
 */
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly username: string,
    private passwordHash: string,
    public readonly role: string,
    public verified: boolean,
    public readonly status: string,
    public readonly provider: string,
    public tokenVersion: number,
    public readonly createdAt: Date,
    public updatedAt: Date,
    // Auth security properties
    private failedAttempts: number = 0,
    private lastFailedAt: Date | null = null,
    private lockExpiresAt: Date | null = null,
  ) {}

  /**
   * Factory method to create a new user
   */
  static create(data: {
    id: string;
    email: string;
    username: string;
    passwordHash: string;
    role?: string;
    verified?: boolean;
    status?: string;
    provider?: string;
  }): User {
    return new User(
      data.id,
      data.email,
      data.username,
      data.passwordHash,
      data.role || 'USER',
      data.verified || false,
      data.status || 'ACTIVE',
      data.provider || 'local',
      0, // tokenVersion
      new Date(),
      new Date(),
    );
  }

  /**
   * Reconstitute user from database (hydration)
   */
  static reconstitute(data: {
    id: string;
    email: string;
    username: string;
    password: string;
    role: string;
    verified: boolean;
    status: string;
    provider: string;
    tokenVersion: number;
    createdAt: Date;
    updatedAt: Date;
    authSecurity?: {
      failedAttempts: number;
      lastFailedAt: Date | null;
      lockExpiresAt: Date | null;
    };
  }): User {
    return new User(
      data.id,
      data.email,
      data.username,
      data.password,
      data.role,
      data.verified,
      data.status,
      data.provider,
      data.tokenVersion,
      data.createdAt,
      data.updatedAt,
      data.authSecurity?.failedAttempts || 0,
      data.authSecurity?.lastFailedAt || null,
      data.authSecurity?.lockExpiresAt || null,
    );
  }

  // ==================== BUSINESS LOGIC METHODS ====================

  /**
   * Verify password against stored hash
   * Business Rule: Password comparison should be constant-time
   */
  verifyPassword(plainPassword: string): boolean {
    return bcrypt.compareSync(plainPassword, this.passwordHash);
  }

  /**
   * Check if account is locked
   * Business Rule: Account is locked if lockExpiresAt is in the future
   */
  isLocked(): boolean {
    if (!this.lockExpiresAt) return false;
    return new Date() < this.lockExpiresAt;
  }

  /**
   * Get lock expiration time
   */
  getLockExpiresAt(): Date | null {
    return this.lockExpiresAt;
  }

  /**
   * Increment failed login attempts
   * Business Rule: Track failed attempts for security
   */
  incrementFailedAttempts(): void {
    this.failedAttempts++;
    this.lastFailedAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Reset failed attempts after successful login
   */
  resetFailedAttempts(): void {
    this.failedAttempts = 0;
    this.lastFailedAt = null;
    this.lockExpiresAt = null;
    this.updatedAt = new Date();
  }

  /**
   * Lock account due to too many failed attempts
   * Business Rule: Lock account for specified duration
   */
  lockAccount(lockDurationMs: number): void {
    this.lockExpiresAt = new Date(Date.now() + lockDurationMs);
    this.updatedAt = new Date();
  }

  /**
   * Check if should lock account based on failed attempts
   */
  shouldLock(maxAttempts: number): boolean {
    return this.failedAttempts >= maxAttempts;
  }

  /**
   * Verify email
   * Business Rule: Can only verify once
   */
  verifyEmail(): void {
    this.verified = true;
    this.updatedAt = new Date();
  }

  /**
   * Update password
   * Business Rule: Token version increments on password change (invalidates all tokens)
   */
  updatePassword(newPasswordHash: string): void {
    this.passwordHash = newPasswordHash;
    this.tokenVersion++;
    this.updatedAt = new Date();
  }

  /**
   * Revoke all tokens (logout from all devices)
   */
  revokeAllTokens(): void {
    this.tokenVersion++;
    this.updatedAt = new Date();
  }

  /**
   * Check if user can login
   * Business Rule: Must be verified, not locked, and active
   */
  canLogin(): { canLogin: boolean; reason?: string } {
    if (this.isLocked()) {
      return {
        canLogin: false,
        reason: `Account is locked until ${this.lockExpiresAt?.toISOString()}`,
      };
    }

    if (!this.verified) {
      return {
        canLogin: false,
        reason: 'Email not verified',
      };
    }

    if (this.status !== 'ACTIVE') {
      return {
        canLogin: false,
        reason: `Account is ${this.status.toLowerCase()}`,
      };
    }

    return { canLogin: true };
  }

  // ==================== GETTERS ====================

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getFailedAttempts(): number {
    return this.failedAttempts;
  }

  getLastFailedAt(): Date | null {
    return this.lastFailedAt;
  }

  isVerified(): boolean {
    return this.verified;
  }

  getTokenVersion(): number {
    return this.tokenVersion;
  }

  /**
   * Increment token version to invalidate all existing JWTs
   * Use this when password is changed or account security is compromised
   */
  incrementTokenVersion(): void {
    this.tokenVersion++;
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object for API response
   * (exclude sensitive data like password)
   */
  toDTO() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      role: this.role,
      verified: this.verified,
      status: this.status,
      provider: this.provider,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
