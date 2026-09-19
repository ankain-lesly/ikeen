import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      auth: {
        update: vi.fn(),
      },
    };

    jwt = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return user + accessToken', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const mockCreatedUser = {
        id: 'user-1',
        email: 'alex@example.com',
        username: 'alex_1234',
        firstName: 'Alex',
        lastName: 'Morgan',
        avatarUrl: null,
        createdAt: new Date(),
      };

      prisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'password123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'alex@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'alex@example.com',
        username: 'alex_1234',
      });
      expect(result).toEqual({
        user: mockCreatedUser,
        accessToken: 'mock-jwt-token',
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          name: 'Alex Morgan',
          email: 'alex@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user and return token when password matches', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'alex@example.com',
        username: 'alex_1234',
        firstName: 'Alex',
        lastName: 'Morgan',
        avatarUrl: null,
        createdAt: new Date(),
        auth: {
          password: hashedPassword,
        },
      });

      prisma.auth.update.mockResolvedValue({});

      const result = await service.login({
        email: 'alex@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('alex@example.com');
      expect(prisma.auth.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'wrong@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 10);

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'alex@example.com',
        auth: {
          password: hashedPassword,
        },
      });

      await expect(
        service.login({
          email: 'alex@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile if user exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'alex@example.com',
        username: 'alex_1234',
        firstName: 'Alex',
        lastName: 'Morgan',
        avatarUrl: null,
        status: 'active',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('missing-id')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
