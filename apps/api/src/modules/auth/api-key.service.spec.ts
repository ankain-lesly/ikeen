import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiKeyService } from './api-key.service.js';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      apiKey: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new ApiKeyService(mockPrisma);
  });

  describe('createApiKey', () => {
    it('creates an API key with ikn_live_ prefix and SHA-256 hash', async () => {
      mockPrisma.apiKey.create.mockImplementation(({ data }: any) => ({
        id: 'key-1',
        name: data.name,
        keyPrefix: data.keyPrefix,
        expiresAt: data.expiresAt ?? null,
        createdAt: new Date(),
      }));

      const result = await service.createApiKey('user-1', {
        name: 'Claude Desktop',
        expiresInDays: 30,
      });

      expect(result.rawKey).toMatch(/^ikn_live_[a-f0-9]{48}$/);
      expect(result.keyPrefix).toBe(result.rawKey.slice(0, 16));
      expect(result.name).toBe('Claude Desktop');
      expect(mockPrisma.apiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Claude Desktop',
          keyPrefix: result.keyPrefix,
          keyHash: service.hashKey(result.rawKey),
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('validateApiKey', () => {
    it('validates a correct ikn_ key and returns user', async () => {
      const rawKey = 'ikn_live_0123456789abcdef0123456789abcdef0123456789abcdef';
      const keyHash = service.hashKey(rawKey);

      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        keyHash,
        expiresAt: null,
        user: {
          id: 'user-1',
          email: 'test@ikeen.app',
          username: 'tester',
          firstName: 'Test',
          lastName: 'User',
          status: 'active',
        },
      });
      mockPrisma.apiKey.update.mockResolvedValue({});

      const user = await service.validateApiKey(rawKey);

      expect(user.id).toBe('user-1');
      expect(user.email).toBe('test@ikeen.app');
    });

    it('rejects keys not starting with ikn_', async () => {
      await expect(service.validateApiKey('invalid_key')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects expired keys', async () => {
      const rawKey = 'ikn_live_0123456789abcdef0123456789abcdef0123456789abcdef';
      mockPrisma.apiKey.findUnique.mockResolvedValue({
        id: 'key-1',
        expiresAt: new Date(Date.now() - 10000), // expired
        user: { id: 'user-1', status: 'active' },
      });

      await expect(service.validateApiKey(rawKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeApiKey', () => {
    it('deletes an API key belonging to the user', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue({ id: 'key-1', userId: 'user-1' });
      mockPrisma.apiKey.delete.mockResolvedValue({ id: 'key-1' });

      const result = await service.revokeApiKey('user-1', 'key-1');
      expect(result).toEqual({ ok: true, revokedId: 'key-1' });
      expect(mockPrisma.apiKey.delete).toHaveBeenCalledWith({ where: { id: 'key-1' } });
    });

    it('throws NotFoundException if key does not exist', async () => {
      mockPrisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.revokeApiKey('user-1', 'key-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
