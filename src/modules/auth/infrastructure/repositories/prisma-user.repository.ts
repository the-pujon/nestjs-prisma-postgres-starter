import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../application/ports/user.repository.port';
import { User } from '../../domain/models/user.model';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

/**
 * Prisma User Repository Implementation
 *
 * This is the concrete implementation (adapter) of the IUserRepository interface.
 * It handles all database operations using Prisma ORM.
 *
 * Benefits:
 * - Isolates Prisma-specific code from business logic
 * - Maps between Prisma models and domain models
 * - Can be easily swapped with another ORM implementation
 * - Makes testing easier (can create in-memory implementation for tests)
 *
 * Pattern: Repository Pattern + Adapter Pattern
 */
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.authUser.findUnique({
      where: { id },
      include: {
        authSecurity: true,
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.prisma.authUser.findUnique({
      where: { email },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const data = await this.prisma.authUser.findUnique({
      where: { username },
    });

    return data ? this.toDomain(data) : null;
  }

  async findByEmailWithSecurity(email: string): Promise<User | null> {
    const data = await this.prisma.authUser.findUnique({
      where: { email },
      include: {
        authSecurity: true,
      },
    });

    return data ? this.toDomain(data) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.authUser.count({
      where: { email },
    });
    return count > 0;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const count = await this.prisma.authUser.count({
      where: { username },
    });
    return count > 0;
  }

  async save(user: User): Promise<void> {
    const data = this.toPrisma(user);

    await this.prisma.$transaction(async (tx) => {
      // Upsert user
      await tx.authUser.upsert({
        where: { id: user.id },
        create: {
          id: data.id,
          email: data.email,
          username: data.username,
          password: data.password,
          role: data.role,
          verified: data.verified,
          status: data.status,
          provider: data.provider,
          tokenVersion: data.tokenVersion,
        },
        update: {
          email: data.email,
          username: data.username,
          password: data.password,
          role: data.role,
          verified: data.verified,
          status: data.status,
          tokenVersion: data.tokenVersion,
          updatedAt: new Date(),
        },
      });

      // Upsert auth security if present
      if (data.authSecurity) {
        await tx.authSecurity.upsert({
          where: { authId: user.id },
          create: {
            authId: user.id,
            failedAttempts: data.authSecurity.failedAttempts,
            lastFailedAt: data.authSecurity.lastFailedAt,
            lockExpiresAt: data.authSecurity.lockExpiresAt,
            mfaEnabled: false,
            lastPasswordChange: new Date(),
          },
          update: {
            failedAttempts: data.authSecurity.failedAttempts,
            lastFailedAt: data.authSecurity.lastFailedAt,
            lockExpiresAt: data.authSecurity.lockExpiresAt,
          },
        });
      }
    });
  }

  async updateSecurityData(
    userId: string,
    securityData: {
      failedAttempts?: number;
      lastFailedAt?: Date | null;
      lockExpiresAt?: Date | null;
    },
  ): Promise<void> {
    await this.prisma.authSecurity.upsert({
      where: { authId: userId },
      create: {
        authId: userId,
        failedAttempts: securityData.failedAttempts || 0,
        lastFailedAt: securityData.lastFailedAt || null,
        lockExpiresAt: securityData.lockExpiresAt || null,
        mfaEnabled: false,
        lastPasswordChange: new Date(),
      },
      update: {
        ...securityData,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.authUser.delete({
      where: { id },
    });
  }

  /**
   * Map Prisma model to Domain model
   * This is where we transform database representation to business representation
   */
  private toDomain(prismaUser: any): User {
    return User.reconstitute({
      id: prismaUser.id,
      email: prismaUser.email,
      username: prismaUser.username,
      password: prismaUser.password,
      role: prismaUser.role,
      verified: prismaUser.verified,
      status: prismaUser.status,
      provider: prismaUser.provider,
      tokenVersion: prismaUser.tokenVersion,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      authSecurity: prismaUser.authSecurity
        ? {
            failedAttempts: prismaUser.authSecurity.failedAttempts,
            lastFailedAt: prismaUser.authSecurity.lastFailedAt,
            lockExpiresAt: prismaUser.authSecurity.lockExpiresAt,
          }
        : undefined,
    });
  }

  /**
   * Map Domain model to Prisma model
   * This is where we transform business representation to database representation
   */
  private toPrisma(user: User): any {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      password: user.getPasswordHash(),
      role: user.role,
      verified: user.verified,
      status: user.status,
      provider: user.provider,
      tokenVersion: user.tokenVersion,
      authSecurity: {
        failedAttempts: user.getFailedAttempts(),
        lastFailedAt: user.getLastFailedAt(),
        lockExpiresAt: user.getLockExpiresAt(),
      },
    };
  }
}
