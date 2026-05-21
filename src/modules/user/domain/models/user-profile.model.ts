/**
 * User Profile Domain Model
 *
 * Represents a user's profile information with business logic.
 *
 * Layer: Domain (Clean Architecture)
 * Responsibilities:
 * - Encapsulate user profile data
 * - Validate business rules
 * - Domain logic for profile operations
 */
export class UserProfile {
  constructor(
    public readonly id: string,
    public email: string,
    public username: string,
    public role: string,
    public emailVerified: boolean,
    public firstName?: string,
    public lastName?: string,
    public avatar?: string,
    public bio?: string,
    public createdAt?: Date,
    public updatedAt?: Date,
  ) {}

  /**
   * Create from Prisma entity
   */
  static fromPrisma(data: any): UserProfile {
    return new UserProfile(
      data.id,
      data.email,
      data.username,
      data.role,
      data.emailVerified,
      data.firstName,
      data.lastName,
      data.avatar,
      data.bio,
      data.createdAt,
      data.updatedAt,
    );
  }

  /**
   * Update profile information
   */
  updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatar?: string;
  }): void {
    if (updates.firstName !== undefined) {
      this.firstName = updates.firstName;
    }
    if (updates.lastName !== undefined) {
      this.lastName = updates.lastName;
    }
    if (updates.bio !== undefined) {
      this.validateBio(updates.bio);
      this.bio = updates.bio;
    }
    if (updates.avatar !== undefined) {
      this.avatar = updates.avatar;
    }
    this.updatedAt = new Date();
  }

  /**
   * Get full name
   */
  getFullName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.username;
  }

  /**
   * Check if profile is complete
   */
  isProfileComplete(): boolean {
    return !!(
      this.firstName &&
      this.lastName &&
      this.emailVerified &&
      this.avatar
    );
  }

  /**
   * Validate bio length
   */
  private validateBio(bio: string): void {
    if (bio && bio.length > 500) {
      throw new Error('Bio cannot exceed 500 characters');
    }
  }

  /**
   * Convert to plain object (for API responses)
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      role: this.role,
      emailVerified: this.emailVerified,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      bio: this.bio,
      fullName: this.getFullName(),
      profileComplete: this.isProfileComplete(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
