import { User } from '../../domain/models/user.model';

/**
 * User Repository Port
 *
 * This is an abstraction (interface) that defines the contract for data access.
 * The actual implementation (adapter) will be in the infrastructure layer.
 *
 * Benefits of using ports:
 * - Dependency Inversion: Business logic doesn't depend on database
 * - Testability: Easy to mock for unit tests
 * - Flexibility: Can swap Prisma for TypeORM without changing business logic
 * - Clear separation: Domain layer stays pure
 */
export interface IUserRepository {
  /**
   * Find user by unique ID
   * @param id - User ID
   * @returns User or null if not found
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email address
   * @param email - Email address
   * @returns User or null if not found
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by username
   * @param username - Username
   * @returns User or null if not found
   */
  findByUsername(username: string): Promise<User | null>;

  /**
   * Find user by email with full security data
   * Used for authentication to get failed attempts, lockout info, etc.
   * @param email - Email address
   * @returns User with security data or null
   */
  findByEmailWithSecurity(email: string): Promise<User | null>;

  /**
   * Check if user exists by email
   * @param email - Email address
   * @returns true if user exists, false otherwise
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Check if user exists by username
   * @param username - Username
   * @returns true if user exists, false otherwise
   */
  existsByUsername(username: string): Promise<boolean>;

  /**
   * Save user (create or update)
   * @param user - User domain model
   */
  save(user: User): Promise<void>;

  /**
   * Update user's auth security data (failed attempts, lockout, etc.)
   * @param userId - User ID
   * @param securityData - Security data to update
   */
  updateSecurityData(
    userId: string,
    securityData: {
      failedAttempts?: number;
      lastFailedAt?: Date | null;
      lockExpiresAt?: Date | null;
    },
  ): Promise<void>;

  /**
   * Delete user (soft delete recommended)
   * @param id - User ID
   */
  delete(id: string): Promise<void>;
}

/**
 * Symbol for dependency injection
 * Use this in @Inject() decorator
 */
export const IUserRepository = Symbol('IUserRepository');
export const USER_REPOSITORY = IUserRepository;
