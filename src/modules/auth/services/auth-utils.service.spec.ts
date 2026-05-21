import { Test, TestingModule } from '@nestjs/testing';
import { AuthUtilsService } from './auth-utils.service';
import { RedisService } from '../../common/services/redis.service';

describe('AuthUtilsService', () => {
  let service: AuthUtilsService;

  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthUtilsService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthUtilsService>(AuthUtilsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePassword', () => {
    it('should return false for password shorter than minimum length', () => {
      expect(service.validatePassword('Short1!')).toBe(false);
    });

    it('should return false for password without uppercase', () => {
      expect(service.validatePassword('password1!')).toBe(false);
    });

    it('should return false for password without lowercase', () => {
      expect(service.validatePassword('PASSWORD1!')).toBe(false);
    });

    it('should return false for password without numbers', () => {
      expect(service.validatePassword('Password!')).toBe(false);
    });

    it('should return false for password without special characters', () => {
      expect(service.validatePassword('Password1')).toBe(false);
    });

    it('should return true for valid password', () => {
      expect(service.validatePassword('Password1!')).toBe(true);
    });
  });
});
