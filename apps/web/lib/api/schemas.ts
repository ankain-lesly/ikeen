import { z } from "zod";
import type {
  Folder,
  Note,
  NoteBlock,
  TextBlock,
  ListBlock,
  MediaBlock,
} from "@repo/types";

// ============================================================================
// Auth Schemas
// ============================================================================

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  type: z.enum(["user", "admin"]).optional(),
});

export const authResponseSchema = z.object({
  user: authUserSchema,
  accessToken: z.string().min(1),
});

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerInputSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6),
});

// ============================================================================
// Block Schemas
// ============================================================================

export const listTypeSchema = z.enum(["checkbox", "bullet", "ordered"]);

export const listItemSchema = z.object({
  id: z.string().min(1),
  content: z.string(),
  checked: z.boolean().optional(),
});

export const mediaItemSchema = z.object({
  id: z.string().min(1),
  mediaType: z.enum(["image", "audio", "file"]),
  localUri: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
  caption: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const baseBlockSchema = z.object({
  id: z.string().min(1),
  noteId: z.string().min(1),
  position: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});

export const textBlockSchema: z.ZodType<TextBlock> = baseBlockSchema.extend({
  type: z.literal("text"),
  content: z.string(),
});

export const listBlockSchema: z.ZodType<ListBlock> = baseBlockSchema.extend({
  type: z.literal("list"),
  listType: listTypeSchema,
  header: z.string().optional(),
  footer: z.string().optional(),
  content: z.array(listItemSchema),
});

export const mediaBlockSchema: z.ZodType<MediaBlock> = baseBlockSchema.extend({
  type: z.literal("media"),
  content: z.array(mediaItemSchema),
});

export const noteBlockSchema: z.ZodType<NoteBlock> = z.discriminatedUnion(
  "type",
  [
    baseBlockSchema.extend({
      type: z.literal("text"),
      content: z.string(),
    }),
    baseBlockSchema.extend({
      type: z.literal("list"),
      listType: listTypeSchema,
      header: z.string().optional(),
      footer: z.string().optional(),
      content: z.array(listItemSchema),
    }),
    baseBlockSchema.extend({
      type: z.literal("media"),
      content: z.array(mediaItemSchema),
    }),
  ],
);

export const upsertBlockInputSchema = z.object({
  type: z.enum(["text", "list", "media"]),
  position: z.number().int().min(0).optional(),
  content: z
    .union([z.string(), z.array(listItemSchema), z.array(mediaItemSchema)])
    .optional(),
  listType: listTypeSchema.optional(),
  header: z.string().nullable().optional(),
  footer: z.string().nullable().optional(),
});

export const softDeleteBlockResponseSchema = z.object({
  id: z.string(),
  noteId: z.string(),
  deletedAt: z.string(),
});

// ============================================================================
// Note Schemas
// ============================================================================

export const noteSchema: z.ZodType<Note> = z.object({
  id: z.string().min(1),
  title: z.string(),
  folderId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  content: z.string(),
  tags: z.array(z.string()),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  summary: z.string().nullable().optional(),
  version: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});

export interface NoteDetail extends Note {
  blocks: NoteBlock[];
}

export const noteDetailSchema: z.ZodType<NoteDetail> = z.object({
  id: z.string().min(1),
  title: z.string(),
  folderId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  content: z.string(),
  tags: z.array(z.string()),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  summary: z.string().nullable().optional(),
  version: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
  blocks: z.array(noteBlockSchema),
});

export const createNoteInputSchema = z.object({
  id: z.string().optional(),
  folderId: z.string().nullable().optional(),
  title: z.string().max(255),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  summary: z.string().nullable().optional(),
});

export const updateNoteInputSchema = z.object({
  folderId: z.string().nullable().optional(),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  summary: z.string().nullable().optional(),
});

// ============================================================================
// Folder Schemas
// ============================================================================

export const folderSchema: z.ZodType<Folder> = z.object({
  id: z.string().min(1),
  userId: z.string().nullable().optional(),
  name: z.string(),
  color: z.string(),
  icon: z.string(),
  isLocked: z.boolean(),
  pinCode: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  version: z.number().int().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});

export const createFolderInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  color: z.string().max(30).optional(),
  icon: z.string().max(50).optional(),
  isLocked: z.boolean().optional(),
  pinCode: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateFolderInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(30).optional(),
  icon: z.string().max(50).optional(),
  isLocked: z.boolean().optional(),
  pinCode: z.string().max(255).nullable().optional(),
  sortOrder: z.number().int().optional(),
});
