import { Module } from '@nestjs/common';

// Domain Layer - Interfaces
import { USER_REPOSITORY } from './application/ports';

// Application Layer - Services
import { UserProfileService } from './application/services/user-profile.service';
import { UserManagementService } from './application/services/user-management.service';

// Infrastructure Layer - Repositories
import { PrismaUserProfileRepository } from './infrastructure/repositories/prisma-user-profile.repository';

// Presentation Layer - Controllers
import { UserController } from './presentation/controllers/user.controller';

// Shared Module (provides PrismaService, RedisService, CustomLoggerService globally)
import { SharedModule } from '../../shared/shared.module';

// Common Services (Legacy - to be moved)
import { ActivityLogService } from '../../common/services/activity-log.service';

/**
 * User Module
 *
 * Implements Clean Architecture for user management.
 *
 * Structure:
 * - Domain: Business logic (UserProfile model)
 * - Application: Use cases (UserProfile, UserManagement services)
 * - Infrastructure: External implementations (Prisma repository)
 * - Presentation: API layer (Controllers, DTOs)
 *
 * Dependencies flow inward:
 * Presentation → Application → Domain
 *            ↘  Infrastructure  ↗
 */
@Module({
  imports: [
    SharedModule, // Import SharedModule to access global services
  ],
  controllers: [
    UserController, // Presentation layer
  ],
  providers: [
    // ============================================
    // Application Services (Use Cases)
    // ============================================
    UserProfileService,
    UserManagementService,

    // ============================================
    // Infrastructure - Repositories
    // ============================================
    PrismaUserProfileRepository,

    // Repository DI binding (interface → implementation)
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserProfileRepository,
    },

    // Note: PrismaService and CustomLoggerService are provided globally by SharedModule
    ActivityLogService, // Needs to be provided locally due to dependency complexity
  ],
  exports: [
    // Export services for use in other modules
    UserProfileService,
    UserManagementService,
    PrismaUserProfileRepository,
    USER_REPOSITORY,
  ],
})
export class UserModule {}
