import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class FolderMutationDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;

  @IsString()
  @IsOptional()
  pinCode?: string | null;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;

  @IsString()
  @IsOptional()
  deletedAt?: string | null;
}

export class NoteMutationDto {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  folderId?: string | null;

  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @IsString()
  @IsOptional()
  summary?: string | null;

  @IsString()
  createdAt: string;

  @IsString()
  updatedAt: string;

  @IsString()
  @IsOptional()
  deletedAt?: string | null;
}

export class SyncPushDto {
  @IsString()
  @IsOptional()
  clientTimestamp?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FolderMutationDto)
  @IsOptional()
  folders?: FolderMutationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteMutationDto)
  @IsOptional()
  notes?: NoteMutationDto[];
}
