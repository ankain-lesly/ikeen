import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { EnvService } from '../../config/env.service.js';

export interface UploadedMediaResult {
  id: string;
  url: string;
  filename: string;
  originalFilename?: string;
  mimeType: string;
  size: number;
}

export interface GeneratedImageBuffer {
  buffer: Buffer;
  mimeType: string;
}

export interface GenerateImageResult {
  ok: boolean;
  url?: string;
  description: string;
  mimeType?: string;
  error?: string;
}

interface MediadockRawResponse {
  data?: {
    id?: string;
    bucket_id?: string;
    filename?: string;
    original_filename?: string;
    url?: string;
    mime_type?: string;
    size?: number;
    status?: string;
    metadata?: Record<string, unknown>;
    created_at?: string;
  };
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly env: EnvService) {}

  /**
   * Calls the configured external image generation service with a description prompt
   * and returns the raw image binary Buffer and mime type.
   */
  async generateImageBuffer(description: string): Promise<GeneratedImageBuffer> {
    const imageUrl = this.env.IMAGE_SERVICE_URL;
    const apiKey = this.env.IMAGE_SERVICE_API_KEY;

    if (!imageUrl || !apiKey) {
      this.logger.warn('Image generation service is not configured in environment.');
      throw new ServiceUnavailableException(
        'Image generation service is not configured in the system environment.',
      );
    }

    try {
      this.logger.log(`Calling image generation provider with prompt: "${description}"`);

      const response = await fetch(imageUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: description }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Image provider returned HTTP ${response.status}: ${errorText}`);
        throw new BadGatewayException(
          `Image generation provider returned HTTP ${response.status}.`,
        );
      }

      const contentType = response.headers.get('content-type') || 'image/png';
      const mimeType = contentType.includes('image/')
        ? contentType.split(';')[0].trim()
        : 'image/png';

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new BadGatewayException('Image provider returned empty binary data.');
      }

      return { buffer, mimeType };
    } catch (err) {
      if (
        err instanceof ServiceUnavailableException ||
        err instanceof BadGatewayException
      ) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error in generateImageBuffer: ${message}`);
      throw new BadGatewayException(`Image generation failed: ${message}`);
    }
  }

  /**
   * Upload a memory buffer (e.g., from generated image or file upload) directly to Mediadock storage.
   */
  async uploadBuffer(
    buffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    folder: string = 'notes',
  ): Promise<UploadedMediaResult> {
    const mediadockUrl = this.env.MEDIADOCK_URL;
    const apiKey = this.env.MEDIADOCK_API_KEY;
    const apiSecret = this.env.MEDIADOCK_API_SECRET;

    if (!mediadockUrl || !apiKey || !apiSecret) {
      this.logger.error('Mediadock storage credentials are not configured in environment.');
      throw new ServiceUnavailableException('Media storage service is not configured.');
    }

    const baseUrl = mediadockUrl.replace(/\/+$/, '');
    const uploadUrl = baseUrl.includes('/upload') ? baseUrl : `${baseUrl}/api/v1/upload`;

    try {
      const formData = new FormData();
      const blob = new Blob([buffer as unknown as BlobPart], { type: mimeType });
      formData.append('file', blob, filename);
      formData.append('folder', folder);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'X-Api-Secret': apiSecret,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Mediadock upload failed: HTTP ${response.status} - ${errorText}`);
        throw new BadGatewayException(`Media upload failed: HTTP ${response.status}`);
      }

      const json = (await response.json()) as MediadockRawResponse;
      const data = json?.data;

      if (!data?.url) {
        this.logger.error('Mediadock upload returned 200 but response missing data.url');
        throw new BadGatewayException('Invalid response received from media storage.');
      }

      return {
        id: data.id || `media-${Date.now()}`,
        url: data.url,
        filename: data.filename || filename,
        originalFilename: data.original_filename || filename,
        mimeType: data.mime_type || mimeType,
        size: data.size || (buffer as Buffer).length || 0,
      };
    } catch (err) {
      if (
        err instanceof ServiceUnavailableException ||
        err instanceof BadGatewayException
      ) {
        throw err;
      }
      this.logger.error(
        `Unexpected error during Mediadock upload: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException('Failed to communicate with media storage.');
    }
  }

  /**
   * Generates an image buffer from the description, uploads it to storage,
   * and returns a safe result with a public CDN URL (never base64).
   */
  async generateAndUploadImage(
    description: string,
    userId: string = 'anonymous',
  ): Promise<GenerateImageResult> {
    try {
      const { buffer, mimeType } = await this.generateImageBuffer(description);

      const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
      const filename = `generated-${Date.now()}.${extension}`;
      const folder = `ikeen/${userId}/generated`;

      const uploaded = await this.uploadBuffer(buffer, filename, mimeType, folder);

      return {
        ok: true,
        url: uploaded.url,
        description,
        mimeType: uploaded.mimeType,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`generateAndUploadImage failed: ${message}`);
      return {
        ok: false,
        description,
        error: message,
      };
    }
  }
}
