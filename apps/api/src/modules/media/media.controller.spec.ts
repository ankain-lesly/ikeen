import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaController } from './media.controller.js';
import { BadRequestException } from '@nestjs/common';
import type { MediaService } from './media.service.js';
import type { AuthenticatedRequest } from '../auth/jwt.strategy.js';

describe('MediaController', () => {
  let controller: MediaController;
  let mockMediaService: Partial<MediaService>;

  const createMockRequest = (userId = 'user-auth-123'): AuthenticatedRequest => ({
    user: {
      id: userId,
      email: `${userId}@example.com`,
    },
  });

  beforeEach(() => {
    mockMediaService = {
      uploadBuffer: vi.fn().mockResolvedValue({
        id: 'media-1',
        url: 'https://cdn.example.com/file.png',
        filename: 'file.png',
        originalFilename: 'file.png',
        mimeType: 'image/png',
        size: 100,
      }),
      getUserMedia: vi.fn().mockResolvedValue({
        ok: true,
        data: [],
        meta: { currentPage: 1, lastPage: 1, perPage: 24, total: 0 },
      }),
    };
    controller = new MediaController(mockMediaService as MediaService);
  });

  describe('upload', () => {
    it('throws BadRequestException if no file is provided', async () => {
      await expect(
        controller.upload(undefined, createMockRequest('user-1')),
      ).rejects.toThrow(BadRequestException);
    });

    it('passes authenticated req.user.id and folder directly to mediaService.uploadBuffer', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'drawing.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 200,
        buffer: Buffer.from('fake-data'),
      };

      const result = await controller.upload(
        mockFile,
        createMockRequest('user-auth-123'),
        'custom-folder',
      );

      expect(result.ok).toBe(true);
      expect(mockMediaService.uploadBuffer).toHaveBeenCalledWith(
        mockFile.buffer,
        'drawing.png',
        'image/png',
        'custom-folder',
        'user-auth-123',
      );
    });
  });

  describe('getUserMedia', () => {
    it('returns user media for authenticated req.user.id', async () => {
      const result = await controller.getUserMedia(
        createMockRequest('user-auth-123'),
        '1',
      );

      expect(result.ok).toBe(true);
      expect(mockMediaService.getUserMedia).toHaveBeenCalledWith('user-auth-123', 1);
    });
  });
});
