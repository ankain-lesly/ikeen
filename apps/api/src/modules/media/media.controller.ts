import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MediaService } from './media.service.js';
import { type AuthenticatedRequest } from '../auth/jwt.strategy.js';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MulterFile | undefined,
    @Req() req: AuthenticatedRequest,
    @Body('folder') folder?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file provided for upload');
    }

    const uploaded = await this.mediaService.uploadBuffer(
      file.buffer,
      file.originalname,
      file.mimetype,
      folder,
      req.user.id,
    );

    return {
      ok: true,
      data: {
        id: uploaded.id,
        url: uploaded.url,
        filename: uploaded.filename,
        original_filename: uploaded.originalFilename ?? uploaded.filename,
        mime_type: uploaded.mimeType,
        size: uploaded.size,
      },
    };
  }

  @Get('user')
  async getUserMedia(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : 1;
    return this.mediaService.getUserMedia(req.user.id, pageNum);
  }
}
