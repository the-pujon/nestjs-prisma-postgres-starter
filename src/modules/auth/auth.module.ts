import { Module } from '@nestjs/common';

// Domain Layer - Interfaces
import { USER_REPOSITORY, AUTH_SESSION_REPOSITORY } from './application/ports';

// Application Layer - Services
import { RegistrationService } from './application/services/registration.service';
import { AuthenticationService } from './application/services/authentication.service';
import { TokenService } from './application/services/token.service';
import { EmailVerificationService } from './application/services/email-verification.service';
import { PasswordResetService } from './application/services/password-reset.service';

// Infrastructure Layer - Repositories & Adapters
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaAuthSessionRepository } from './infrastructure/repositories/redis-auth-session.repository';
import { GoogleOAuthAdapter } from './infrastructure/adapters/google-oauth.adapter';

// Presentation Layer - Controllers
import { AuthController } from './presentation/controllers/auth.controller';

// Shared Module (provides PrismaService, RedisService, CustomLoggerService globally)
import { SharedModule } from '../../shared/shared.module';
import { EmailQueueService } from '../../shared/infrastructure/queues/email-queue.service';
import { ActivityLogService } from '../../shared/infrastructure/services/activity-log.service';
import { AuthUtilsService } from './services/auth-utils.service';
import { GoogleOAuthService } from './services/google-oauth.service';
import { EmailService } from '../../shared/infrastructure/services/email.service';
import { QueueModule } from '../../shared/infrastructure/modules/queue.module';

/**
 * Auth Module
 *
 * Implements Clean Architecture for authentication.
 *
 * Structure:
 * - Domain: Business logic (User, AuthSession models)
 * - Application: Use cases (Registration, Authentication, Token services)
 * - Infrastructure: External implementations (Prisma repositories, OAuth adapter)
 * - Presentation: API layer (Controllers, DTOs, Guards)
 *
 * Dependencies flow inward:
 * Presentation → Application → Domain
 *            ↘  Infrastructure  ↗
 */
@Module({
  imports: [
    SharedModule, // Import SharedModule to access global services
    QueueModule, // Import QueueModule for EmailQueueService
  ],
  controllers: [
    AuthController, // Presentation layer
  ],
  providers: [
    // ============================================
    // Application Services (Use Cases)
    // ============================================
    RegistrationService,
    AuthenticationService,
    TokenService,
    EmailVerificationService,
    PasswordResetService,

    // ============================================
    // Infrastructure - Repositories
    // ============================================
    PrismaUserRepository,
    PrismaAuthSessionRepository,

    // Repository DI bindings (interface → implementation)
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: AUTH_SESSION_REPOSITORY,
      useClass: PrismaAuthSessionRepository,
    },

    // ============================================
    // Infrastructure - Adapters
    // ============================================
    GoogleOAuthAdapter,

    // Note: PrismaService, RedisService, and CustomLoggerService
    // are provided globally by SharedModule
    EmailQueueService, // Requires BullModule import
    ActivityLogService, // Needs to be provided locally due to dependency complexity
    EmailService,
    AuthUtilsService,
    GoogleOAuthService, // Used by GoogleOAuthAdapter
  ],
  exports: [
    // Export services for use in other modules
    RegistrationService,
    AuthenticationService,
    TokenService,
    EmailVerificationService,
    PasswordResetService,
    PrismaUserRepository,
    PrismaAuthSessionRepository,
    USER_REPOSITORY,
    AUTH_SESSION_REPOSITORY,
  ],
})
export class AuthModule {}
