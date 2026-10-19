import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateApiKeyDto } from './dto/create-api-key.dto.js';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hashes a raw key with SHA-256.
   */
  hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Generates a new Personal Access Token (PAT) for MCP and headless clients.
   * Returns the rawKey only once.
   */
  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    const existingCount = await this.prisma.apiKey.count({
      where: { userId },
    });

    if (existingCount >= 25) {
      throw new BadRequestException(
        'Maximum quota of 25 active API keys reached. Please revoke unused keys before creating new ones.',
      );
    }

    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `ikn_live_${randomHex}`;
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = this.hashKey(rawKey);

    let expiresAt: Date | undefined;
    if (dto.expiresInDays && dto.expiresInDays > 0) {
      expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);
    }

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId,
        name: dto.name.trim(),
        keyHash,
        keyPrefix,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    this.logger.log(`Created API key "${apiKey.name}" for user ${userId}`);

    return {
      ...apiKey,
      rawKey,
    };
  }

  /**
   * Validates an incoming API key against stored SHA-256 hashes.
   * Returns the authenticated user and the matched API key metadata.
   */
  async validateApiKey(rawKey: string) {
    if (!rawKey || !rawKey.startsWith('ikn_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const keyHash = this.hashKey(rawKey);
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!apiKey || !apiKey.user) {
      throw new UnauthorizedException('API key is invalid or revoked');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    if (apiKey.user.status !== 'active') {
      throw new UnauthorizedException('User account is suspended');
    }

    // Update lastUsedAt in the background
    void this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: unknown) => {
        this.logger.warn(`Failed to update lastUsedAt for key ${apiKey.id}:`, err);
      });

    return {
      user: apiKey.user,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
      },
    };
  }

  /**
   * Lists all active API keys for a user (without exposing secret hashes).
   */
  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revokes an API key.
   */
  async revokeApiKey(userId: string, keyId: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id: keyId },
    });

    this.logger.log(`Revoked API key ${keyId} for user ${userId}`);

    return { ok: true, revokedId: keyId };
  }
}
