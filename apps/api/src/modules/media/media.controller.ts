import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MediaService } from './media.service.js';

export interface MulterFile {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MulterFile | undefined,
    @Body('folder') folder?: string,
    @Request() req?: { user?: { id?: string } },
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided for upload');
    }

    const userId = req?.user?.id || 'anonymous';
    const targetFolder = folder || `ikeen/${userId}`;

    const uploaded = await this.mediaService.uploadBuffer(
      file.buffer,
      file.originalname || `upload-${Date.now()}`,
      file.mimetype || 'application/octet-stream',
      targetFolder,
    );

    return {
      ok: true,
      data: {
        id: uploaded.id,
        url: uploaded.url,
        filename: uploaded.filename,
        original_filename: uploaded.originalFilename || uploaded.filename,
        mime_type: uploaded.mimeType,
        size: uploaded.size,
      },
    };
  }
}
