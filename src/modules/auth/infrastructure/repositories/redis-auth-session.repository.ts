import { Injectable } from '@nestjs/common';
import { IAuthSessionRepository } from '../../application/ports/auth-session.repository.port';
import { AuthSession } from '../../domain/models/auth-session.model';
import { RedisService } from '../../../../shared/infrastructure/cache/redis.service';

/**
 * Redis-based Auth Session Repository
 *
 * Uses Redis for session storage (no database persistence).
 * This is better for sessions because:
 * - Faster access (in-memory)
 * - Automatic expiration with TTL
 * - Better for horizontal scaling
 * - No database cleanup needed
 */
@Injectable()
export class PrismaAuthSessionRepository implements IAuthSessionRepository {
  constructor(private readonly redis: RedisService) {}

  private getSessionKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  async findById(id: string): Promise<AuthSession | null> {
    const key = this.getSessionKey(id);
    const data = await this.redis.get(key);

    if (!data || typeof data !== 'string') {
      return null;
    }

    const parsed = JSON.parse(data);
    return new AuthSession(
      parsed.id,
      parsed.authId,
      parsed.refreshToken,
      parsed.ip,
      parsed.userAgent,
      parsed.device || null,
      new Date(parsed.expiresAt),
      parsed.revoked || false,
      new Date(parsed.createdAt),
      parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
    );
  }

  async findByUserId(userId: string): Promise<AuthSession[]> {
    // Use SCAN to find sessions for this user
    // This is a limitation: we scan all session keys to find matching userId
    // In production, consider maintaining a separate index for user sessions
    const sessions: AuthSession[] = [];
    let cursor = '0';

    do {
      // Use Redis SCAN through the client
      const result = await this.redis['client'].scan(
        cursor,
        'MATCH',
        'session:*',
        'COUNT',
        100,
      );
      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        const session = await this.findById(key.replace('session:', ''));
        if (session && session.authId === userId) {
          sessions.push(session);
        }
      }
    } while (cursor !== '0');
    return sessions;
  }

  async findByRefreshToken(refreshToken: string): Promise<AuthSession | null> {
    // Store a mapping for fast lookups
    const sessionId = await this.redis.get(`refresh:${refreshToken}`);

    if (!sessionId || typeof sessionId !== 'string') {
      return null;
    }

    return this.findById(sessionId);
  }

  async save(session: AuthSession): Promise<void> {
    const key = this.getSessionKey(session.id);
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    // Store session data
    await this.redis.set(
      key,
      JSON.stringify({
        id: session.id,
        authId: session.authId,
        refreshToken: session.refreshToken,
        ip: session.ip,
        userAgent: session.userAgent,
        device: session.device,
        expiresAt: session.expiresAt.toISOString(),
        revoked: session.revoked,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      }),
      ttl > 0 ? ttl : 3600, // Default to 1 hour if TTL is negative
    );

    // Store refresh token mapping
    await this.redis.set(
      `refresh:${session.refreshToken}`,
      session.id,
      ttl > 0 ? ttl : 3600,
    );
  }

  async delete(id: string): Promise<void> {
    const session = await this.findById(id);
    if (session) {
      await this.redis.del(this.getSessionKey(id));
      await this.redis.del(`refresh:${session.refreshToken}`);
    }
  }

  async deleteByUserId(userId: string): Promise<void> {
    const sessions = await this.findByUserId(userId);

    for (const session of sessions) {
      await this.redis.del(this.getSessionKey(session.id));
      await this.redis.del(`refresh:${session.refreshToken}`);
    }
  }

  async findActiveSessionsByUserId(userId: string): Promise<AuthSession[]> {
    const sessions = await this.findByUserId(userId);
    return sessions.filter((s) => !s.revoked && s.expiresAt > new Date());
  }

  async findAllSessionsByUserId(userId: string): Promise<AuthSession[]> {
    return this.findByUserId(userId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (session) {
      session.revoke();
      await this.save(session);
    }
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.findByUserId(userId);
    for (const session of sessions) {
      session.revoke();
      await this.save(session);
    }
  }

  async deleteExpired(): Promise<void> {
    // Redis automatically deletes expired keys with TTL
    // This method is a no-op, but kept for interface compatibility
  }

  async deleteExpiredSessions(): Promise<void> {
    // Alias for deleteExpired
    await this.deleteExpired();
  }
}
