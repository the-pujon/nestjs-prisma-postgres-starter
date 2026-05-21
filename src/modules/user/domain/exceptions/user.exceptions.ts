/**
 * User Domain Exceptions
 *
 * Domain-specific exceptions for user operations.
 *
 * Layer: Domain (Clean Architecture)
 */

export class UserNotFoundException extends Error {
  constructor(identifier?: string) {
    super(identifier ? `User not found: ${identifier}` : 'User not found');
    this.name = 'UserNotFoundException';
  }
}

export class UserAlreadyExistsException extends Error {
  constructor(identifier: string) {
    super(`User already exists: ${identifier}`);
    this.name = 'UserAlreadyExistsException';
  }
}

export class InvalidUserDataException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidUserDataException';
  }
}

export class UserDeletionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserDeletionException';
  }
}
