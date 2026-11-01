import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MediaService } from './media.service.js';
import { BadGatewayException } from '@nestjs/common';
import type { EnvService } from '../../config/env.service.js';

describe('MediaService', () => {
  let service: MediaService;
  let mockEnv: Partial<EnvService>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockEnv = {
      MEDIADOCK_URL: 'https://mediadock.example.com',
      MEDIADOCK_API_KEY: 'test-api-key',
      MEDIADOCK_API_SECRET: 'test-api-secret',
      IMAGE_SERVICE_URL: 'https://images.example.com/generate',
      IMAGE_SERVICE_API_KEY: 'test-img-key',
    };
    service = new MediaService(mockEnv as EnvService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('generateImageBuffer', () => {
    it('calls external image provider and returns raw buffer and mime type', async () => {
      const fakeImageData = new Uint8Array([1, 2, 3, 4, 5]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (h: string) => (h === 'content-type' ? 'image/png' : null),
        },
        arrayBuffer: async () => fakeImageData.buffer,
      });

      const result = await service.generateImageBuffer('a lovely landscape');

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBe(5);
      expect(result.mimeType).toBe('image/png');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://images.example.com/generate',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-img-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: 'a lovely landscape' }),
        }),
      );
    });

    it('throws BadGatewayException if external image provider fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Prompt disallowed',
      });

      await expect(service.generateImageBuffer('disallowed prompt')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('uploadBuffer', () => {
    it('uploads a buffer successfully and returns metadata with remote URL', async () => {
      const mockResponse = {
        data: {
          id: 'media-123',
          url: 'https://cdn.mediadock.example.com/uploads/ikeen/test.png',
          filename: 'test.png',
          original_filename: 'test.png',
          mime_type: 'image/png',
          size: 5,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await service.uploadBuffer(
        Buffer.from('hello'),
        'test.png',
        'image/png',
        'ikeen/user-1',
      );

      expect(result).toEqual({
        id: 'media-123',
        url: 'https://cdn.mediadock.example.com/uploads/ikeen/test.png',
        filename: 'test.png',
        originalFilename: 'test.png',
        mimeType: 'image/png',
        size: 5,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://mediadock.example.com/api/v1/upload',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-Api-Key': 'test-api-key',
            'X-Api-Secret': 'test-api-secret',
          },
        }),
      );
    });

    it('uploads a buffer with clientUserId and appends client_user_id to FormData', async () => {
      let capturedFormData: FormData | null = null;
      global.fetch = vi.fn().mockImplementation(async (_url: string, init: any) => {
        capturedFormData = init.body;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              id: 'media-456',
              url: 'https://cdn.mediadock.example.com/uploads/ikeen/user-123/test.png',
              filename: 'test.png',
              original_filename: 'test.png',
              mime_type: 'image/png',
              size: 5,
            },
          }),
        };
      });

      const result = await service.uploadBuffer(
        Buffer.from('hello'),
        'test.png',
        'image/png',
        'ikeen/user-123',
        'user-123',
      );

      expect(result.id).toBe('media-456');
      expect(capturedFormData).not.toBeNull();
      expect(capturedFormData!.get('client_user_id')).toBe('user-123');
      expect(capturedFormData!.get('folder')).toBe('ikeen/user-123');
    });

    it('throws BadGatewayException if Mediadock responds with an error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Mediadock Error',
      });

      await expect(
        service.uploadBuffer(Buffer.from('hello'), 'test.png', 'image/png'),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('generateAndUploadImage', () => {
    it('generates image buffer and uploads to storage, returning public CDN URL', async () => {
      const generateBufferSpy = vi.spyOn(service, 'generateImageBuffer').mockResolvedValue({
        buffer: Buffer.from([1, 2, 3]),
        mimeType: 'image/png',
      });
      const uploadBufferSpy = vi.spyOn(service, 'uploadBuffer').mockResolvedValue({
        id: 'media-999',
        url: 'https://cdn.mediadock.example.com/gen.png',
        filename: 'gen.png',
        originalFilename: 'gen.png',
        mimeType: 'image/png',
        size: 3,
      });

      const result = await service.generateAndUploadImage('a mountain cabin at dusk', 'user-42');

      expect(result).toEqual({
        ok: true,
        url: 'https://cdn.mediadock.example.com/gen.png',
        description: 'a mountain cabin at dusk',
        mimeType: 'image/png',
      });

      expect(generateBufferSpy).toHaveBeenCalledWith('a mountain cabin at dusk');
      expect(uploadBufferSpy).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/^generated-\d+\.png$/),
        'image/png',
        'ikeen/user-42/generated',
        'user-42',
      );
    });

    it('returns ok: false with error message gracefully on failure', async () => {
      vi.spyOn(service, 'generateImageBuffer').mockRejectedValue(new Error('Provider rate limit'));

      const result = await service.generateAndUploadImage('busy scene', 'user-1');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Provider rate limit');
    });
  });

  describe('getUserMedia', () => {
    it('queries user media endpoint and returns data with pagination metadata', async () => {
      const mockListResponse = {
        data: [
          {
            id: 'media-1',
            client_user_id: 'user-77',
            filename: 'photo1.jpg',
            original_filename: 'camera.jpg',
            url: 'https://cdn.mediadock.example.com/photo1.jpg',
            mime_type: 'image/jpeg',
            size: 1024,
            status: 'ready',
            created_at: '2026-10-31T15:00:00Z',
          },
        ],
        meta: {
          current_page: 1,
          last_page: 2,
          per_page: 24,
          total: 30,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockListResponse,
      });

      const result = await service.getUserMedia('user-77', 1);

      expect(result.ok).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 'media-1',
        clientUserId: 'user-77',
        filename: 'photo1.jpg',
        originalFilename: 'camera.jpg',
        url: 'https://cdn.mediadock.example.com/photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        status: 'ready',
        createdAt: '2026-10-31T15:00:00Z',
      });
      expect(result.meta).toEqual({
        currentPage: 1,
        lastPage: 2,
        perPage: 24,
        total: 30,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://mediadock.example.com/api/v1/media/user/user-77?page=1',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Api-Key': 'test-api-key',
            'X-Api-Secret': 'test-api-secret',
          },
        }),
      );
    });

    it('throws BadGatewayException if Mediadock user endpoint returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'Upstream service error',
      });

      await expect(service.getUserMedia('user-error')).rejects.toThrow(BadGatewayException);
    });
  });
});
