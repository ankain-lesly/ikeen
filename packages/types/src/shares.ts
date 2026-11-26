import type { NoteBlock } from "./notes";

export type ShareAccess = "view" | "copy";

export interface NoteShare {
  id: string;
  noteId: string;
  slug: string;
  url: string;
  isActive: boolean;
  access: ShareAccess;
  hasPassword: boolean;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteShareInput {
  access?: ShareAccess;
  expiresAt?: string | null;
  password?: string | null;
}

export interface UpdateNoteShareInput {
  isActive?: boolean;
  access?: ShareAccess;
  expiresAt?: string | null;
  password?: string | null;
  rotateSlug?: boolean;
}

export interface PublicShareAuthor {
  firstName: string;
  username: string;
}

export interface PublicSharedNote {
  slug: string;
  title: string;
  tags: string[];
  updatedAt: string;
  author: PublicShareAuthor;
  blocks: NoteBlock[];
  access: ShareAccess;
  canFork: boolean;
}

export interface PublicShareLockedResponse {
  requiresPassword: true;
  slug: string;
}

export interface UnlockShareResponse {
  token: string;
  expiresIn: number;
}

export interface ForkShareResponse {
  noteId: string;
  title: string;
}
