import { Controller, Get, Post, Body, Req, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

// Application Services
import { RegistrationService } from '../../application/services/registration.service';
import { AuthenticationService } from '../../application/services/authentication.service';
import { EmailVerificationService } from '../../application/services/email-verification.service';
import { PasswordResetService } from '../../application/services/password-reset.service';

// Infrastructure Adapters
import { GoogleOAuthAdapter } from '../../infrastructure/adapters/google-oauth.adapter';

// Request DTOs
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ResendVerificationDto,
  RefreshTokenDto,
  LogoutDto,
  LogoutAllDto,
  InitiatePasswordResetDto,
  ResetPasswordDto,
  GoogleOAuthInitDto,
  GoogleOAuthCallbackDto,
} from '../dto/requests';

// Shared Services
import { CustomLoggerService } from '../../../../shared/infrastructure/logging/logger.service';
import { THROTTLER_CONFIG } from '../../../../common/config/throttler.config';

/**
 * Authentication Controller
 *
 * Handles all authentication-related HTTP endpoints.
 * Delegates business logic to application services.
 *
 * Layer: Presentation (Clean Architecture)
 * Responsibilities:
 * - HTTP request/response handling
 * - Input validation (via DTOs)
 * - Rate limiting
 * - Logging requests
 * - Delegating to application services
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly authenticationService: AuthenticationService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly googleOAuthAdapter: GoogleOAuthAdapter,
    private readonly logger: CustomLoggerService,
  ) {}

  /**
   * Extract metadata from request
   */
  private extractMeta(req: Request) {
    return {
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      device:
        (Array.isArray(req.headers['x-device'])
          ? req.headers['x-device'][0]
          : req.headers['x-device']) ||
        (Array.isArray(req.headers['x-device-id'])
          ? req.headers['x-device-id'][0]
          : req.headers['x-device-id']) ||
        (Array.isArray(req.headers['sec-ch-ua-platform'])
          ? req.headers['sec-ch-ua-platform'][0]
          : req.headers['sec-ch-ua-platform']),
    };
  }

  // ==========================================
  // Registration & Email Verification
  // ==========================================

  @Post('register')
  @Throttle({ default: THROTTLER_CONFIG.AUTH })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or user already exists',
  })
  async register(@Body() payload: RegisterDto, @Req() req: Request) {
    this.logger.log(
      `Registration attempt for email: ${payload.email}`,
      'AuthController',
    );

    const meta = this.extractMeta(req);
    await this.registrationService.register(payload, meta);

    return {
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  @Post('verify-email')
  @Throttle({ default: THROTTLER_CONFIG.AUTH })
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() payload: VerifyEmailDto, @Req() req: Request) {
    this.logger.log(
      `Email verification attempt for: ${payload.email}`,
      'AuthController',
    );

    const meta = this.extractMeta(req);
    const result = await this.emailVerificationService.verifyEmail(
      payload.email,
      payload.code,
      meta,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Post('resend-verification-email')
  @Throttle({ default: THROTTLER_CONFIG.AUTH })
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  async resendVerificationEmail(
    @Body() payload: ResendVerificationDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      `Resend verification email for: ${payload.email}`,
      'AuthController',
    );

    const meta = this.extractMeta(req);
    const result = await this.emailVerificationService.resendVerificationEmail(
      payload.email,
      meta,
    );

    return {
      success: true,
      ...result,
    };
  }

  // ==========================================
  // Login & Logout
  // ==========================================

  @Post('login')
  @Throttle({ default: THROTTLER_CONFIG.AUTH })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() payload: LoginDto, @Req() req: Request) {
    this.logger.log(
      `Login attempt for email: ${payload.email}`,
      'AuthController',
    );

    const meta = this.extractMeta(req);
    const result = await this.authenticationService.login(
      { email: payload.email, password: payload.password },
      meta,
    );

    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Body() payload: RefreshTokenDto, @Req() req: Request) {
    this.logger.log('Token refresh requested', 'AuthController');

    const meta = this.extractMeta(req);
    const result = await this.authenticationService.refreshToken(
      payload.refreshToken,
      meta,
    );

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Body() payload: LogoutDto, @Req() req: Request) {
    this.logger.log(
      `Logout requested for user: ${payload.userId}`,
      'AuthController',
    );

    const result = await this.authenticationService.logout(
      payload.refreshToken,
      payload.userId,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Post('logout-all')
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutAll(@Body() payload: LogoutAllDto) {
    this.logger.log(
      `Logout all devices for user: ${payload.userId}`,
      'AuthController',
    );

    const result = await this.authenticationService.logoutAllDevices(
      payload.userId,
    );

    return {
      success: true,
      ...result,
    };
  }

  // ==========================================
  // Password Reset
  // ==========================================

  @Post('forgot-password')
  @Throttle({ default: THROTTLER_CONFIG.AUTH })
  @ApiOperation({ summary: 'Initiate password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent if email exists',
  })
  async forgotPassword(
    @Body() payload: InitiatePasswordResetDto,
    @Req() req: Request,
  ) {
    this.logger.log(
      `Password reset initiated for: ${payload.email}`,
      'AuthController',
    );

    const meta = this.extractMeta(req);
    const result = await this.passwordResetService.initiatePasswordReset(
      payload.email,
      meta,
    );

    return {
      success: true,
      ...result,
    };
  }

  @Post('reset-password')
  @Throttle({ default: THROTTLER_CONFIG.AUTH })
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() payload: ResetPasswordDto, @Req() req: Request) {
    this.logger.log(
      `Password reset attempt for: ${payload.email}`,
      'AuthController',
    );

    const meta = this.extractMeta(req);
    const result = await this.passwordResetService.resetPassword(
      payload.email,
      payload.token,
      payload.newPassword,
      meta,
    );

    return {
      success: true,
      ...result,
    };
  }

  // ==========================================
  // Google OAuth
  // ==========================================

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  @ApiResponse({ status: 200, description: 'Returns Google authorization URL' })
  async googleOAuthInit(
    @Query() query: GoogleOAuthInitDto,
    @Req() req: Request,
  ) {
    this.logger.log('Google OAuth initialization requested', 'AuthController');

    const meta = this.extractMeta(req);
    const result = await this.googleOAuthAdapter.initOAuth(meta);

    return {
      success: true,
      data: result,
      message: 'Redirect to the provided URL to authenticate with Google',
    };
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'OAuth successful' })
  async googleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (error) {
      this.logger.warn(
        `Google OAuth error: ${error} - ${errorDescription}`,
        'AuthController',
      );

      return {
        success: false,
        error,
        errorDescription,
        message: 'Google authentication failed',
      };
    }

    if (!code || !state) {
      return {
        success: false,
        error: 'missing_parameters',
        message: 'Missing authorization code or state parameter',
      };
    }

    this.logger.log('Google OAuth callback received', 'AuthController');

    const meta = this.extractMeta(req);
    const result = await this.googleOAuthAdapter.handleCallback(
      state,
      code,
      meta,
    );

    // Handle redirect if needed
    if (result.redirectUrl) {
      const redirectUrl = new URL(result.redirectUrl);
      redirectUrl.searchParams.set('access_token', result.accessToken);
      redirectUrl.searchParams.set('refresh_token', result.refreshToken);
      redirectUrl.searchParams.set('user_id', result.user.id);
      redirectUrl.searchParams.set('email', result.user.email);
      redirectUrl.searchParams.set('is_new_user', result.isNewUser.toString());

      return res.redirect(redirectUrl.toString());
    }

    return {
      success: true,
      message: result.isNewUser
        ? 'Account created successfully via Google'
        : 'Signed in successfully via Google',
      data: result,
    };
  }

  @Post('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback (POST)' })
  @ApiResponse({ status: 200, description: 'OAuth successful' })
  async googleOAuthCallbackPost(
    @Body() payload: GoogleOAuthCallbackDto,
    @Req() req: Request,
  ) {
    this.logger.log('Google OAuth callback (POST) received', 'AuthController');

    const meta = this.extractMeta(req);
    const result = await this.googleOAuthAdapter.handleCallback(
      payload.state,
      payload.code,
      meta,
    );

    return {
      success: true,
      message: result.isNewUser
        ? 'Account created successfully via Google'
        : 'Signed in successfully via Google',
      data: result,
    };
  }
}
