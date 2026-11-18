import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email ini sudah terdaftar.');
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        fullName: dto.fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        isEmailVerified: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });

    return {
      message: 'Registrasi berhasil.',
      user,
      tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah.');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });

    return {
      message: 'Login berhasil.',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
        isSuperAdmin: user.isSuperAdmin,
        createdAt: user.createdAt,
      },
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        logoUrl: m.organization.logoUrl,
        role: m.role,
        status: m.status,
      })),
      tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const refreshSecret =
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'default-jwt-refresh-secret-key-32-chars';

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Sesi tidak valid.');
      }

      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
      });

      return {
        message: 'Token berhasil diperbarui.',
        tokens,
      };
    } catch {
      throw new UnauthorizedException('Refresh token kedaluwarsa atau tidak valid.');
    }
  }

  private async generateTokens(payload: JwtPayload) {
    const accessSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'default-jwt-secret-key-32-chars-min';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default-jwt-refresh-secret-key-32-chars';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
