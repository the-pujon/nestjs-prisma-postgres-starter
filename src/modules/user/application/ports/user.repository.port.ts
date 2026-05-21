import { UserProfile } from '../../domain/models/user-profile.model';

/**
 * User Repository Port
 *
 * Defines contract for user data access.
 */
export interface IUserRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  findByUsername(username: string): Promise<UserProfile | null>;
  findAll(skip?: number, take?: number): Promise<UserProfile[]>;
  count(): Promise<number>;
  save(user: UserProfile): Promise<UserProfile>;
  delete(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
