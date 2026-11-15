import { IsObject, IsOptional, IsString } from 'class-validator';
import type { Prisma } from '../../../generated/prisma/client.js';

export class SendTestNotificationDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsObject()
  @IsOptional()
  data?: Prisma.InputJsonObject;
}
