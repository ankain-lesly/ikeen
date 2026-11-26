import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { MediaItem, NoteBlock } from '@repo/types/notes';
import type {
  ForkShareResponse,
  NoteShare,
  PublicSharedNote,
  ShareAccess,
  UnlockShareResponse,
} from '@repo/types/shares';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EnvService } from '../../config/env.service.js';
import {
  packServerBlockContent,
  unpackServerNoteBlock,
} from '../notes/block-content.codec.js';
import type { CreateShareDto } from './dto/create-share.dto.js';
import type { UpdateShareDto } from './dto/update-share.dto.js';

const SLUG_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SLUG_LENGTH = 12;
const MAX_SLUG_RETRIES = 3;
const BCRYPT_ROUNDS = 10;
const UNLOCK_TOKEN_TTL_SECONDS = 3600;

interface ShareUnlockPayload {
  sub: string;
  slug: string;
  type: 'share_unlock';
  v: number;
}

interface ShareRow {
  id: string;
  noteId: string;
  createdById: string;
  slug: string;
  isActive: boolean;
  access: ShareAccess;
  passwordHash: string | null;
  expiresAt: Date | null;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ResolvedPublicShare extends ShareRow {
  note: {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: Date;
    deletedAt: Date | null;
    folder: { isLocked: boolean } | null;
    user: { firstName: string; username: string };
    blocks: Array<{
      id: string;
      noteId: string;
      type: 'text' | 'list' | 'media';
      position: number;
      content: unknown;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    }>;
  };
}

function isRemoteHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function isUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly jwtService: JwtService,
  ) {}

  generateSlug(): string {
    const bytes = randomBytes(SLUG_LENGTH);
    let slug = '';
    for (let i = 0; i < SLUG_LENGTH; i += 1) {
      slug += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
    }
    return slug;
  }

  async getShare(userId: string, noteId: string): Promise<NoteShare | null> {
    await this.assertOwnedNote(userId, noteId);

    const share = await this.prisma.noteShare.findUnique({
      where: { noteId },
    });
    if (!share) return null;

    return this.toNoteShareDto(share);
  }

  async upsertShare(
    userId: string,
    noteId: string,
    dto: CreateShareDto,
  ): Promise<NoteShare> {
    await this.assertShareableNote(userId, noteId);

    const expiresAt =
      dto.expiresAt !== undefined
        ? this.parseExpiresAt(dto.expiresAt)
        : undefined;
    const passwordHash =
      dto.password !== undefined
        ? dto.password === null
          ? null
          : await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        : undefined;

    const existing = await this.prisma.noteShare.findUnique({
      where: { noteId },
    });

    if (existing) {
      const updated = await this.prisma.noteShare.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          ...(dto.access !== undefined && { access: dto.access }),
          ...(expiresAt !== undefined && { expiresAt }),
          ...(passwordHash !== undefined && { passwordHash }),
        },
      });
      return this.toNoteShareDto(updated);
    }

    const created = await this.withSlugRetry(async (slug) =>
      this.prisma.noteShare.create({
        data: {
          noteId,
          createdById: userId,
          slug,
          isActive: true,
          access: dto.access ?? 'view',
          expiresAt: expiresAt ?? null,
          passwordHash: passwordHash ?? null,
        },
      }),
    );

    return this.toNoteShareDto(created);
  }

  async updateShare(
    userId: string,
    noteId: string,
    dto: UpdateShareDto,
  ): Promise<NoteShare> {
    await this.assertShareableNote(userId, noteId);

    const existing = await this.prisma.noteShare.findUnique({
      where: { noteId },
    });
    if (!existing) {
      throw new NotFoundException('Share link not found for this note');
    }

    const expiresAt =
      dto.expiresAt !== undefined
        ? this.parseExpiresAt(dto.expiresAt)
        : undefined;
    const passwordHash =
      dto.password !== undefined
        ? dto.password === null
          ? null
          : await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
        : undefined;

    const baseData = {
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.access !== undefined && { access: dto.access }),
      ...(expiresAt !== undefined && { expiresAt }),
      ...(passwordHash !== undefined && { passwordHash }),
    };

    const updated = dto.rotateSlug
      ? await this.withSlugRetry(async (slug) =>
          this.prisma.noteShare.update({
            where: { id: existing.id },
            data: { ...baseData, slug },
          }),
        )
      : await this.prisma.noteShare.update({
          where: { id: existing.id },
          data: baseData,
        });

    return this.toNoteShareDto(updated);
  }

  async revokeShare(
    userId: string,
    noteId: string,
  ): Promise<{ revoked: true; noteId: string }> {
    await this.assertOwnedNote(userId, noteId);

    const existing = await this.prisma.noteShare.findUnique({
      where: { noteId },
    });
    if (!existing) {
      throw new NotFoundException('Share link not found for this note');
    }

    await this.prisma.noteShare.delete({
      where: { id: existing.id },
    });

    return { revoked: true, noteId };
  }

  async getPublicShare(
    slug: string,
    shareToken?: string,
  ): Promise<PublicSharedNote> {
    const share = await this.resolveActiveShare(slug);
    this.assertUnlockAccess(share, shareToken);

    await this.prisma.noteShare
      .update({
        where: { id: share.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to increment viewCount for share ${share.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    const blocks = share.note.blocks.map((row) =>
      this.sanitizePublicBlock(row, share.slug),
    );

    return {
      slug: share.slug,
      title: share.note.title,
      tags: share.note.tags,
      updatedAt: share.note.updatedAt.toISOString(),
      author: {
        firstName: share.note.user.firstName,
        username: share.note.user.username,
      },
      blocks,
      access: share.access,
      canFork: share.access === 'copy',
    };
  }

  async unlockShare(
    slug: string,
    password: string,
  ): Promise<UnlockShareResponse> {
    const share = await this.resolveActiveShare(slug);
    if (!share.passwordHash) {
      throw new BadRequestException('This shared note is not password-protected');
    }

    const isValid = await bcrypt.compare(password, share.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid passcode');
    }

    const payload: ShareUnlockPayload = {
      sub: share.id,
      slug: share.slug,
      type: 'share_unlock',
      v: share.updatedAt.getTime(),
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: UNLOCK_TOKEN_TTL_SECONDS,
    });

    return {
      token,
      expiresIn: UNLOCK_TOKEN_TTL_SECONDS,
    };
  }

  async forkShare(
    userId: string,
    slug: string,
    shareToken?: string,
  ): Promise<ForkShareResponse> {
    const share = await this.resolveActiveShare(slug);
    this.assertUnlockAccess(share, shareToken);

    if (share.access !== 'copy') {
      throw new ForbiddenException('Copying is disabled for this shared note');
    }

    const sanitizedBlocks = share.note.blocks.map((row) =>
      this.sanitizePublicBlock(row, share.slug),
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const forkedNote = await tx.note.create({
        data: {
          userId,
          folderId: null,
          title: share.note.title,
          content: share.note.content,
          tags: share.note.tags,
          isPinned: false,
          isArchived: false,
        },
      });

      if (sanitizedBlocks.length > 0) {
        await tx.noteBlock.createMany({
          data: sanitizedBlocks.map((block, index) => ({
            noteId: forkedNote.id,
            type: block.type,
            position: index,
            content: packServerBlockContent(block.type, {
              content: block.content,
              ...(block.type === 'list'
                ? {
                    listType: block.listType,
                    header: block.header,
                    footer: block.footer,
                  }
                : {}),
            }) as Prisma.InputJsonValue,
          })),
        });
      }

      return forkedNote;
    });

    return {
      noteId: created.id,
      title: created.title,
    };
  }

  private async assertOwnedNote(userId: string, noteId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
      select: {
        id: true,
        folder: { select: { isLocked: true } },
      },
    });
    if (!note) {
      throw new NotFoundException('Note not found');
    }
    return note;
  }

  private async assertShareableNote(userId: string, noteId: string) {
    const note = await this.assertOwnedNote(userId, noteId);
    if (note.folder?.isLocked) {
      throw new ForbiddenException(
        'Notes inside locked folders cannot be shared',
      );
    }
    return note;
  }

  private async resolveActiveShare(slug: string): Promise<ResolvedPublicShare> {
    const share = await this.prisma.noteShare.findUnique({
      where: { slug },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            content: true,
            tags: true,
            updatedAt: true,
            deletedAt: true,
            folder: { select: { isLocked: true } },
            user: { select: { firstName: true, username: true } },
            blocks: {
              where: { deletedAt: null },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });

    if (!share || !share.isActive) {
      throw new NotFoundException('Shared note not found');
    }

    if (share.expiresAt && share.expiresAt.getTime() <= Date.now()) {
      throw new NotFoundException('Shared note link has expired');
    }

    if (share.note.deletedAt !== null || share.note.folder?.isLocked) {
      throw new NotFoundException('Shared note is no longer available');
    }

    return share as ResolvedPublicShare;
  }

  private assertUnlockAccess(share: ShareRow, shareToken?: string): void {
    if (!share.passwordHash) return;

    if (shareToken) {
      try {
        const payload = this.jwtService.verify<ShareUnlockPayload>(shareToken);
        if (
          payload.type === 'share_unlock' &&
          payload.sub === share.id &&
          payload.slug === share.slug &&
          payload.v === share.updatedAt.getTime()
        ) {
          return;
        }
      } catch {
        // Fall through to structured 401
      }
    }

    throw new UnauthorizedException({
      message: 'Passcode required',
      requiresPassword: true,
      slug: share.slug,
    });
  }

  private parseExpiresAt(raw: string | null): Date | null {
    if (raw === null) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be a valid future date');
    }
    return parsed;
  }

  private sanitizeMediaItems(items: MediaItem[]): MediaItem[] {
    return items
      .filter((item) => isRemoteHttpUrl(item.url))
      .map((item) => ({
        ...item,
        localUri: '',
      }));
  }

  private sanitizePublicBlock(
    row: ResolvedPublicShare['note']['blocks'][number],
    slug: string,
  ): NoteBlock {
    const unpacked = unpackServerNoteBlock(row);
    if (unpacked.type === 'media') {
      return {
        ...unpacked,
        noteId: slug,
        content: this.sanitizeMediaItems(unpacked.content),
      };
    }

    return {
      ...unpacked,
      noteId: slug,
    };
  }

  private async withSlugRetry<T>(
    operation: (slug: string) => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt += 1) {
      try {
        return await operation(this.generateSlug());
      } catch (err) {
        if (isUniqueConstraintError(err)) {
          lastError = err;
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  private toNoteShareDto(row: ShareRow): NoteShare {
    return {
      id: row.id,
      noteId: row.noteId,
      slug: row.slug,
      url: this.env.getShareUrl(row.slug),
      isActive: row.isActive,
      access: row.access,
      hasPassword: Boolean(row.passwordHash),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      viewCount: row.viewCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
