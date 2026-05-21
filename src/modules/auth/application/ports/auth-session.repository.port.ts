import { AuthSession } from '../../domain/models/auth-session.model';

/**
 * AuthSession Repository Port
 *
 * Defines the contract for session data access.
 */
export interface IAuthSessionRepository {
  /**
   * Find session by ID
   * @param id - Session ID
   * @returns AuthSession or null
   */
  findById(id: string): Promise<AuthSession | null>;

  /**
   * Find session by refresh token
   * @param refreshToken - Refresh token string
   * @returns AuthSession or null
   */
  findByRefreshToken(refreshToken: string): Promise<AuthSession | null>;

  /**
   * Find all active sessions for a user
   * @param userId - User ID
   * @returns Array of active sessions
   */
  findActiveSessionsByUserId(userId: string): Promise<AuthSession[]>;

  /**
   * Find all sessions for a user (including revoked)
   * @param userId - User ID
   * @returns Array of all sessions
   */
  findAllSessionsByUserId(userId: string): Promise<AuthSession[]>;

  /**
   * Save session (create or update)
   * @param session - AuthSession domain model
   */
  save(session: AuthSession): Promise<void>;

  /**
   * Revoke session by ID
   * @param sessionId - Session ID
   */
  revokeSession(sessionId: string): Promise<void>;

  /**
   * Revoke all sessions for a user
   * @param userId - User ID
   */
  revokeAllUserSessions(userId: string): Promise<void>;

  /**
   * Delete expired sessions (cleanup)
   */
  deleteExpiredSessions(): Promise<void>;

  /**
   * Delete session by ID
   * @param id - Session ID
   */
  delete(id: string): Promise<void>;
}

/**
 * Symbol for dependency injection
 */
export const IAuthSessionRepository = Symbol('IAuthSessionRepository');
export const AUTH_SESSION_REPOSITORY = IAuthSessionRepository;
