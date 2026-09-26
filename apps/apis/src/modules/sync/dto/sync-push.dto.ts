import type { FolderChanges } from '@repo/types/folders';
import type { NoteChanges } from '@repo/types/notes';
import type {
  FolderMutationPayload,
  NoteMutationPayload,
  SyncActionType
} from '@repo/types/sync';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';


export class FolderChangesDto implements FolderChanges {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  userId?: string | null;

  @IsString()
  @IsOptional()
  name?: string;

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

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  @IsOptional()
  createdAt?: string;

  @IsString()
  @IsOptional()
  updatedAt?: string;

  @IsString()
  @IsOptional()
  deletedAt?: string | null;
}

export class FolderMutationDto implements FolderMutationPayload {
  @IsString()
  id: string;

  @IsString()
  mutationId: string;

  @IsIn(['upsert', 'delete'])
  action: SyncActionType;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  updatedAt: string;

  @IsObject()
  @ValidateNested()
  @Type(() => FolderChangesDto)
  changes: FolderChangesDto;
}

export class NoteChangesDto implements NoteChanges {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  userId?: string | null;

  @IsString()
  @IsOptional()
  folderId?: string | null;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

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

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  @IsOptional()
  createdAt?: string;

  @IsString()
  @IsOptional()
  updatedAt?: string;

  @IsString()
  @IsOptional()
  deletedAt?: string | null;
}

export class NoteMutationDto implements NoteMutationPayload {
  @IsString()
  id: string;

  @IsString()
  mutationId: string;

  @IsIn(['upsert', 'delete'])
  action: SyncActionType;

  @IsNumber()
  @IsOptional()
  version?: number;

  @IsString()
  updatedAt: string;

  @IsObject()
  @ValidateNested()
  @Type(() => NoteChangesDto)
  changes: NoteChangesDto;
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
