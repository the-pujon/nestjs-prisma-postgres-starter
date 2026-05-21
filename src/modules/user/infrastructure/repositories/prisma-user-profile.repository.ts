import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../application/ports/user.repository.port';
import { UserProfile } from '../../domain/models/user-profile.model';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';

/**
 * Prisma User Repository
 *
 * Implements user repository using Prisma ORM.
 *
 * Layer: Infrastructure (Clean Architecture)
 * Pattern: Repository Pattern
 * Responsibilities:
 * - Data access using Prisma
 * - Mapping between Prisma entities and domain models
 * - Handling database operations
 */
@Injectable()
export class PrismaUserProfileRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserProfile | null> {
    const user = await this.prisma.authUser.findUnique({
      where: { id },
    });

    return user ? UserProfile.fromPrisma(user) : null;
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    const user = await this.prisma.authUser.findUnique({
      where: { email },
    });

    return user ? UserProfile.fromPrisma(user) : null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const user = await this.prisma.authUser.findUnique({
      where: { username },
    });

    return user ? UserProfile.fromPrisma(user) : null;
  }

  async findAll(skip = 0, take = 10): Promise<UserProfile[]> {
    const users = await this.prisma.authUser.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => UserProfile.fromPrisma(user));
  }

  async count(): Promise<number> {
    return this.prisma.authUser.count();
  }

  async save(userProfile: UserProfile): Promise<UserProfile> {
    // Update userProfile table (firstName, lastName, bio, avatar)
    await this.prisma.userProfile.upsert({
      where: { authId: userProfile.id },
      create: {
        authId: userProfile.id,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        bio: userProfile.bio,
        avatarUrl: userProfile.avatar,
      },
      update: {
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        bio: userProfile.bio,
        avatarUrl: userProfile.avatar,
        updatedAt: new Date(),
      },
    });

    // Return updated profile
    const updated = await this.prisma.authUser.findUnique({
      where: { id: userProfile.id },
      include: { userProfile: true },
    });

    return UserProfile.fromPrisma(updated!);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.authUser.delete({
      where: { id },
    });
  }
}
