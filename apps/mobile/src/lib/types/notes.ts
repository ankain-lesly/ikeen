import type {
  NoteSelect,
  InsertNote,
  NoteBlockSelect,
  InsertNoteBlock,
} from '../../db/schema';
import type {
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  ListNotesOptions,
  NoteChanges,
  BlockType,
  ListType,
  ListItem,
  MediaType,
  MediaItem,
  ImageMetadata,
  AudioMetadata,
  FileMetadata,
  MediaMetadata,
  BaseBlock,
  TextBlock,
  ListBlock,
  MediaBlock,
  NoteBlock,
  CreateBlockInput,
  UpdateBlockInput,
} from '@repo/types';

export { hasActiveNotesFilters } from '@repo/types';

export type NoteWithBlocks = NoteSelect & {
  blocks?: NoteBlock[];
};

export type {
  NoteSelect,
  Note,
  InsertNote,
  NoteBlockSelect,
  InsertNoteBlock,
  CreateNoteInput,
  UpdateNoteInput,
  ListNotesOptions,
  NoteChanges,
  BlockType,
  ListType,
  ListItem,
  MediaType,
  MediaItem,
  ImageMetadata,
  AudioMetadata,
  FileMetadata,
  MediaMetadata,
  BaseBlock,
  TextBlock,
  ListBlock,
  MediaBlock,
  NoteBlock,
  CreateBlockInput,
  UpdateBlockInput,
};
