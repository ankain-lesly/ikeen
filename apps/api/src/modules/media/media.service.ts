import {
  Injectable,
  Logger,
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

export interface UserMediaItem {
  id: string;
  clientUserId?: string;
  filename: string;
  originalFilename?: string;
  url: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
}

export interface UserMediaPaginationMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface UserMediaResponse {
  ok: boolean;
  data: UserMediaItem[];
  meta?: UserMediaPaginationMeta;
}

export interface MediadockItem {
  id: string;
  bucket_id?: string;
  client_user_id?: string;
  filename: string;
  original_filename?: string;
  url: string;
  mime_type: string;
  size: number;
  status: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface MediadockRawResponse<T = MediadockItem> {
  data?: T;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  message?: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly env: EnvService) {}

  private get mediadockHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.env.MEDIADOCK_API_KEY,
      'X-Api-Secret': this.env.MEDIADOCK_API_SECRET,
    };
  }

  private get mediadockBaseUrl(): string {
    const raw = this.env.MEDIADOCK_URL.replace(/\/upload\/?$/, '').replace(/\/+$/, '');
    return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
  }

  /**
   * Calls the configured external image generation service with a description prompt
   * and returns the raw image binary Buffer and mime type.
   */
  async generateImageBuffer(description: string): Promise<GeneratedImageBuffer> {
    try {
      this.logger.log(`Calling image generation provider with prompt: "${description}"`);

      const response = await fetch(this.env.IMAGE_SERVICE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.env.IMAGE_SERVICE_API_KEY}`,
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

      const contentType = response.headers.get('content-type');
      const mimeType = contentType?.includes('image/')
        ? contentType.split(';')[0].trim()
        : 'image/png';

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) {
        throw new BadGatewayException('Image provider returned empty binary data.');
      }

      return { buffer, mimeType };
    } catch (err) {
      if (err instanceof BadGatewayException) {
        throw err;
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error in generateImageBuffer: ${message}`);
      throw new BadGatewayException(`Image generation failed: ${message}`);
    }
  }

  /**
   * Upload a memory buffer directly to Mediadock storage.
   */
  async uploadBuffer(
    buffer: Buffer | Uint8Array,
    filename: string,
    mimeType: string,
    folder?: string,
    clientUserId?: string,
  ): Promise<UploadedMediaResult> {
    const uploadUrl = `${this.mediadockBaseUrl}/upload`;

    try {
      const formData = new FormData();
      formData.append(
        'file',
        new Blob([buffer as unknown as BlobPart], { type: mimeType }),
        filename,
      );
      if (folder) {
        formData.append('folder', folder);
      }
      if (clientUserId) {
        formData.append('client_user_id', clientUserId);
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: this.mediadockHeaders,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Mediadock upload failed: HTTP ${response.status} - ${errorText}`);
        throw new BadGatewayException(`Media upload failed: HTTP ${response.status}`);
      }

      const json = (await response.json()) as MediadockRawResponse<MediadockItem>;
      const data = json.data;

      if (!data?.url) {
        this.logger.error('Mediadock upload returned 200 but response missing data.url');
        throw new BadGatewayException('Invalid response received from media storage.');
      }

      return {
        id: data.id,
        url: data.url,
        filename: data.filename ?? filename,
        originalFilename: data.original_filename ?? filename,
        mimeType: data.mime_type ?? mimeType,
        size: data.size ?? buffer.byteLength,
      };
    } catch (err) {
      if (err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.error(
        `Unexpected error during Mediadock upload: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException('Failed to communicate with media storage.');
    }
  }

  /**
   * Generates an image buffer from description and uploads it to storage.
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

      const uploaded = await this.uploadBuffer(
        buffer,
        filename,
        mimeType,
        folder,
        userId,
      );

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

  /**
   * Fetches uploaded media for a user from Mediadock storage by client_user_id.
   */
  async getUserMedia(
    userId: string,
    page: number = 1,
  ): Promise<UserMediaResponse> {
    const queryUrl = `${this.mediadockBaseUrl}/media/user/${encodeURIComponent(userId)}?page=${page}`;

    try {
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: this.mediadockHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mediadock getUserMedia failed for user ${userId}: HTTP ${response.status} - ${errorText}`,
        );
        throw new BadGatewayException(`Media retrieval failed: HTTP ${response.status}`);
      }

      const json = (await response.json()) as MediadockRawResponse<MediadockItem[]>;

      return {
        ok: true,
        data: (json.data ?? []).map((item) => ({
          id: item.id,
          clientUserId: item.client_user_id,
          filename: item.filename,
          originalFilename: item.original_filename ?? item.filename,
          url: item.url,
          mimeType: item.mime_type,
          size: item.size,
          status: item.status,
          createdAt: item.created_at,
        })),
        meta: json.meta
          ? {
              currentPage: json.meta.current_page,
              lastPage: json.meta.last_page,
              perPage: json.meta.per_page,
              total: json.meta.total,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof BadGatewayException) {
        throw err;
      }
      this.logger.error(
        `Unexpected error during Mediadock getUserMedia: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException('Failed to communicate with media storage.');
    }
  }
}
