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
import type {
  FolderChanges,
  FolderMutationPayload,
  NoteChanges,
  NoteMutationPayload,
  SyncActionType,
} from '@repo/types';

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

// BlockChanges is Partial<NoteBlock> which is a union type — TypeScript does not allow
// `implements` with union types, so we omit it and rely on structural compatibility.
export class BlockChangesDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  noteId?: string;

  @IsIn(['text', 'list', 'media'])
  @IsOptional()
  type?: 'text' | 'list' | 'media';

  @IsNumber()
  @IsOptional()
  position?: number;

  // Content is a markdown string for text blocks, or a JSON array for list/media blocks.
  @IsOptional()
  content?: any;

  @IsString()
  @IsOptional()
  listType?: string;

  @IsString()
  @IsOptional()
  header?: string;

  @IsString()
  @IsOptional()
  footer?: string;

  @IsString()
  @IsOptional()
  createdAt?: string;

  @IsString()
  @IsOptional()
  updatedAt?: string;
}

// BlockMutationPayload.changes is BlockChanges (a union) — omit `implements` for same reason.
export class BlockMutationDto {
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
  @Type(() => BlockChangesDto)
  changes: BlockChangesDto;
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockMutationDto)
  @IsOptional()
  note_blocks?: BlockMutationDto[];
}

