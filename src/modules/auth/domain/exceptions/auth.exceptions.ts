import AppError from '../../../../common/errors/app.error';

/**
 * Domain Exceptions for Auth Module
 *
 * These are domain-specific exceptions that represent business rule violations.
 * They are thrown by domain models or application services when business rules are violated.
 *
 * Benefits:
 * - Clear, semantic error names
 * - Centralized error messages
 * - Easy to handle in exception filters
 */

/**
 * User Already Exists Exception
 * Thrown when trying to register with an email or username that already exists
 */
export class UserAlreadyExistsException extends AppError {
  constructor(identifier?: string) {
    super(
      409,
      identifier
        ? `User with ${identifier} already exists`
        : 'User already exists',
    );
  }
}

/**
 * Invalid Credentials Exception
 * Thrown when email or password is incorrect during login
 */
export class InvalidCredentialsException extends AppError {
  constructor() {
    super(401, 'Invalid email or password');
  }
}

/**
 * Account Locked Exception
 * Thrown when trying to login to a locked account
 */
export class AccountLockedException extends AppError {
  constructor(lockExpiresAt?: Date | null) {
    const message = lockExpiresAt
      ? `Account is locked until ${lockExpiresAt.toISOString()}`
      : 'Account is locked due to too many failed login attempts';
    super(403, message);
  }
}

/**
 * Email Not Verified Exception
 * Thrown when trying to login with unverified email
 */
export class EmailNotVerifiedException extends AppError {
  constructor() {
    super(
      403,
      'Email not verified. Please check your email for verification link',
    );
  }
}

/**
 * Email Already Verified Exception
 * Thrown when trying to verify already verified email
 */
export class EmailAlreadyVerifiedException extends AppError {
  constructor() {
    super(400, 'Email is already verified');
  }
}

/**
 * Invalid Verification Code Exception
 * Thrown when verification code is invalid or expired
 */
export class InvalidVerificationCodeException extends AppError {
  constructor() {
    super(
      400,
      'Invalid or expired verification code. Please request a new one',
    );
  }
}

/**
 * Invalid Token Exception
 * Thrown when JWT token is invalid, expired, or malformed
 */
export class InvalidTokenException extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(401, message);
  }
}

/**
 * Token Expired Exception
 * Thrown when JWT token has expired
 */
export class TokenExpiredException extends AppError {
  constructor() {
    super(401, 'Token has expired');
  }
}

/**
 * User Not Found Exception
 * Thrown when user is not found in database
 */
export class UserNotFoundException extends AppError {
  constructor(identifier?: string) {
    super(404, identifier ? `User ${identifier} not found` : 'User not found');
  }
}

/**
 * Weak Password Exception
 * Thrown when password doesn't meet strength requirements
 */
export class WeakPasswordException extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

/**
 * Invalid Email Exception
 * Thrown when email format is invalid
 */
export class InvalidEmailException extends AppError {
  constructor(email?: string) {
    super(
      400,
      email ? `Invalid email format: ${email}` : 'Invalid email format',
    );
  }
}

/**
 * Session Not Found Exception
 * Thrown when auth session is not found
 */
export class SessionNotFoundException extends AppError {
  constructor() {
    super(404, 'Session not found or has been revoked');
  }
}

/**
 * Session Expired Exception
 * Thrown when session/refresh token has expired
 */
export class SessionExpiredException extends AppError {
  constructor() {
    super(401, 'Session has expired. Please login again');
  }
}

/**
 * Session Revoked Exception
 * Thrown when trying to use a revoked session
 */
export class SessionRevokedException extends AppError {
  constructor() {
    super(401, 'Session has been revoked. Please login again');
  }
}

/**
 * Account Inactive Exception
 * Thrown when account status is not ACTIVE
 */
export class AccountInactiveException extends AppError {
  constructor(status: string) {
    super(403, `Account is ${status.toLowerCase()}. Please contact support`);
  }
}

/**
 * Rate Limit Exceeded Exception
 * Thrown when rate limit is exceeded
 */
export class RateLimitExceededException extends AppError {
  constructor(retryAfter?: number) {
    const message = retryAfter
      ? `Too many requests. Please try again in ${retryAfter} seconds`
      : 'Too many requests. Please try again later';
    super(429, message);
  }
}

/**
 * OAuth Error Exception
 * Thrown when OAuth authentication fails
 */
export class OAuthErrorException extends AppError {
  constructor(message: string) {
    super(400, `OAuth authentication failed: ${message}`);
  }
}

/**
 * Invalid Password Exception
 * Thrown when current password is incorrect during password change
 */
export class InvalidPasswordException extends AppError {
  constructor() {
    super(400, 'Current password is incorrect');
  }
}

/**
 * Invalid Reset Token Exception
 * Thrown when password reset token is invalid
 */
export class InvalidResetTokenException extends AppError {
  constructor() {
    super(400, 'Invalid or expired password reset token');
  }
}

/**
 * Password Reset Token Expired Exception
 * Thrown when password reset token has expired
 */
export class PasswordResetTokenExpiredException extends AppError {
  constructor() {
    super(400, 'Password reset token has expired');
  }
}
