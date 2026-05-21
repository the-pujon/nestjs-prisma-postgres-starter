/**
 * AuthSession Domain Model
 *
 * Represents a user's authentication session (refresh token)
 * Contains business logic for session management
 */
export class AuthSession {
  constructor(
    public readonly id: string,
    public readonly authId: string,
    public readonly refreshToken: string,
    public readonly ip: string,
    public readonly userAgent: string,
    public readonly device: string | null,
    public readonly expiresAt: Date,
    public revoked: boolean,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  /**
   * Factory method to create new session
   */
  static create(data: {
    id: string;
    authId: string;
    refreshToken: string;
    ip: string;
    userAgent: string;
    device?: string;
    expiresAt: Date;
  }): AuthSession {
    return new AuthSession(
      data.id,
      data.authId,
      data.refreshToken,
      data.ip,
      data.userAgent,
      data.device || null,
      data.expiresAt,
      false,
      new Date(),
      new Date(),
    );
  }

  /**
   * Reconstitute from database
   */
  static reconstitute(data: {
    id: string;
    authId: string;
    refreshToken: string;
    ip: string;
    userAgent: string;
    device: string | null;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AuthSession {
    return new AuthSession(
      data.id,
      data.authId,
      data.refreshToken,
      data.ip,
      data.userAgent,
      data.device,
      data.expiresAt,
      data.revoked,
      data.createdAt,
      data.updatedAt,
    );
  }

  // ==================== BUSINESS LOGIC METHODS ====================

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if session is valid (not revoked and not expired)
   */
  isValid(): boolean {
    return !this.revoked && !this.isExpired();
  }

  /**
   * Revoke session
   */
  revoke(): void {
    this.revoked = true;
    this.updatedAt = new Date();
  }

  /**
   * Check if session can be used
   */
  canBeUsed(): { valid: boolean; reason?: string } {
    if (this.revoked) {
      return { valid: false, reason: 'Session has been revoked' };
    }

    if (this.isExpired()) {
      return { valid: false, reason: 'Session has expired' };
    }

    return { valid: true };
  }

  /**
   * Convert to DTO for API response
   */
  toDTO() {
    return {
      id: this.id,
      ip: this.ip,
      userAgent: this.userAgent,
      device: this.device,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      isActive: this.isValid(),
    };
  }
}
