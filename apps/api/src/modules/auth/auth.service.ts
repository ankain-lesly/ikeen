import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
// import { log } from '@repo/utils';

const log = (...args: any[]) => {
  console.log('DD', args);
};


@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const emailPrefix = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedUsername = `${emailPrefix || 'user'}_${randomSuffix}`;

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const nameParts = dto.name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          username: generatedUsername,
          firstName,
          lastName,
          auth: {
            create: {
              type: 'password',
              provider: 'self',
              password: hashedPassword,
            },
          },
        },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      const accessToken = this.generateToken(user.id, user.email, user.username);

      log('[Auth:Register:Success]', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      return {
        user,
        accessToken,
      };
    } catch {
      throw new InternalServerErrorException('Failed to create account');
    }
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        auth: true,
      },
    });

    if (!user || !user.auth?.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.auth.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.auth.update({
      where: { userId: user.id },
      data: { lastLogin: new Date() },
    });

    const accessToken = this.generateToken(user.id, user.email, user.username);

    log('[Auth:Login:Success]', {
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      accessToken,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateToken(userId: string, email: string, username: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      username,
    });
  }
}
