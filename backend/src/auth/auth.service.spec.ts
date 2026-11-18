import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: any;
  let jwtService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-token'),
      verify: vi.fn(),
    };

    const configService = {
      get: vi.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-jwt-secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'budi@majujaya.com',
        fullName: 'Budi Santoso',
        avatarUrl: null,
        isEmailVerified: false,
        isSuperAdmin: false,
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: 'budi@majujaya.com',
        password: 'Password123!',
        fullName: 'Budi Santoso',
      });

      expect(result.message).toBe('Registrasi berhasil.');
      expect(result.user.email).toBe('budi@majujaya.com');
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.tokens.refreshToken).toBe('mock-token');
    });

    it('should throw ConflictException if email is already taken', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.register({
          email: 'budi@majujaya.com',
          password: 'Password123!',
          fullName: 'Budi Santoso',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid password and return organizations', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'budi@majujaya.com',
        passwordHash: hashedPassword,
        fullName: 'Budi Santoso',
        avatarUrl: null,
        isEmailVerified: true,
        isSuperAdmin: false,
        createdAt: new Date(),
        memberships: [
          {
            role: 'OWNER',
            status: 'ACTIVE',
            organization: {
              id: 'org-uuid-1',
              name: 'PT Maju Jaya',
              slug: 'maju-jaya',
              logoUrl: null,
              isActive: true,
            },
          },
        ],
      });

      const result = await authService.login({
        email: 'budi@majujaya.com',
        password: 'Password123!',
      });

      expect(result.message).toBe('Login berhasil.');
      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].name).toBe('PT Maju Jaya');
      expect(result.tokens.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'budi@majujaya.com',
        passwordHash: hashedPassword,
      });

      await expect(
        authService.login({
          email: 'budi@majujaya.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'AnyPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should issue new tokens when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-uuid-1', email: 'budi@mail.com', isSuperAdmin: false });
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'budi@mail.com',
        isSuperAdmin: false,
      });

      const result = await authService.refreshTokens('valid-refresh-token');
      expect(result.message).toBe('Token berhasil diperbarui.');
      expect(result.tokens.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException when refresh token verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(authService.refreshTokens('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
