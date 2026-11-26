import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SharesService } from './shares.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EnvService } from '../../config/env.service.js';

type MockPrisma = {
  note: Record<string, ReturnType<typeof vi.fn>>;
  noteBlock: Record<string, ReturnType<typeof vi.fn>>;
  noteShare: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};

describe('SharesService', () => {
  let service: SharesService;
  let prisma: MockPrisma;
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verify: ReturnType<typeof vi.fn>;
  };

  const now = new Date('2026-11-26T10:00:00.000Z');
  const futureDate = new Date(Date.now() + 86_400_000);
  const pastDate = new Date(Date.now() - 86_400_000);

  const makeShareRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'share-1',
    noteId: 'note-1',
    createdById: 'user-1',
    slug: 'AbCdEf123456',
    isActive: true,
    access: 'view' as const,
    passwordHash: null as string | null,
    expiresAt: null as Date | null,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  const makePublicShareRow = (overrides: Record<string, unknown> = {}) => ({
    ...makeShareRow(),
    note: {
      id: 'note-1',
      title: 'Shared Roadmap',
      content: 'Summary body',
      tags: ['product'],
      updatedAt: now,
      deletedAt: null as Date | null,
      folder: { isLocked: false },
      user: { firstName: 'Lee', username: 'devlee' },
      blocks: [
        {
          id: 'blk-1',
          noteId: 'note-1',
          type: 'text' as const,
          position: 0,
          content: 'Hello world',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: 'blk-2',
          noteId: 'note-1',
          type: 'media' as const,
          position: 1,
          content: [
            {
              id: 'm-1',
              mediaType: 'image',
              localUri: 'file:///var/mobile/local.jpg',
              url: 'https://cdn.ikeen.app/img.jpg',
            },
            {
              id: 'm-2',
              mediaType: 'image',
              localUri: 'file:///var/mobile/unsynced.jpg',
            },
          ],
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
    },
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      note: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      noteBlock: {
        createMany: vi.fn(),
      },
      noteShare: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn(async (fn: (tx: MockPrisma) => Promise<unknown>) =>
        fn(prisma),
      ),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('signed-unlock-jwt'),
      verify: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: EnvService,
          useValue: {
            getShareUrl: (slug: string) => `https://ikeen.app/s/${slug}`,
          },
        },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<SharesService>(SharesService);
  });

  describe('generateSlug', () => {
    it('generates a 12-char alphanumeric base62 slug', () => {
      const slug = service.generateSlug();
      expect(slug).toMatch(/^[0-9A-Za-z]{12}$/);
    });
  });

  describe('upsertShare', () => {
    it('creates a new share with canonical URL and hashed password', async () => {
      prisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        folder: { isLocked: false },
      });
      prisma.noteShare.findUnique.mockResolvedValue(null);
      prisma.noteShare.create.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) =>
          makeShareRow({
            slug: data.slug,
            access: data.access,
            passwordHash: data.passwordHash,
            expiresAt: data.expiresAt,
          }),
      );

      const res = await service.upsertShare('user-1', 'note-1', {
        access: 'copy',
        password: 'secret-pass',
        expiresAt: futureDate.toISOString(),
      });

      expect(res.slug).toMatch(/^[0-9A-Za-z]{12}$/);
      expect(res.url).toBe(`https://ikeen.app/s/${res.slug}`);
      expect(res.access).toBe('copy');
      expect(res.hasPassword).toBe(true);
      expect(res).not.toHaveProperty('passwordHash');

      const createArg = prisma.noteShare.create.mock.calls[0]?.[0] as {
        data: { passwordHash: string };
      };
      expect(await bcrypt.compare('secret-pass', createArg.data.passwordHash)).toBe(true);
    });

    it('rejects notes inside locked folders with ForbiddenException', async () => {
      prisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        folder: { isLocked: true },
      });

      await expect(
        service.upsertShare('user-1', 'note-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects missing or trashed notes with NotFoundException', async () => {
      prisma.note.findFirst.mockResolvedValue(null);

      await expect(
        service.upsertShare('user-1', 'note-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects past expiresAt timestamps with BadRequestException', async () => {
      prisma.note.findFirst.mockResolvedValue({
        id: 'note-1',
        folder: null,
      });

      await expect(
        service.upsertShare('user-1', 'note-1', {
          expiresAt: pastDate.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateShare', () => {
    it('rotates slug and clears password when password is null', async () => {
      prisma.note.findFirst.mockResolvedValue({ id: 'note-1', folder: null });
      prisma.noteShare.findUnique.mockResolvedValue(
        makeShareRow({ passwordHash: 'old-hash' }),
      );
      prisma.noteShare.update.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) =>
          makeShareRow({
            slug: data.slug,
            passwordHash: data.passwordHash,
          }),
      );

      const res = await service.updateShare('user-1', 'note-1', {
        password: null,
        rotateSlug: true,
      });

      expect(res.slug).not.toBe('AbCdEf123456');
      expect(res.hasPassword).toBe(false);
    });
  });

  describe('revokeShare', () => {
    it('deletes the share record when owned', async () => {
      prisma.note.findFirst.mockResolvedValue({ id: 'note-1', folder: null });
      prisma.noteShare.findUnique.mockResolvedValue(makeShareRow());
      prisma.noteShare.delete.mockResolvedValue(makeShareRow());

      const res = await service.revokeShare('user-1', 'note-1');
      expect(res).toEqual({ revoked: true, noteId: 'note-1' });
      expect(prisma.noteShare.delete).toHaveBeenCalledWith({
        where: { id: 'share-1' },
      });
    });
  });

  describe('getPublicShare', () => {
    it('returns sanitized public payload, strips file:// media and note.id, and increments viewCount', async () => {
      prisma.noteShare.findUnique.mockResolvedValue(makePublicShareRow());
      prisma.noteShare.update.mockResolvedValue(makeShareRow({ viewCount: 1 }));

      const res = await service.getPublicShare('AbCdEf123456');

      expect(res.slug).toBe('AbCdEf123456');
      expect(res.title).toBe('Shared Roadmap');
      expect(res.author).toEqual({ firstName: 'Lee', username: 'devlee' });
      expect(res.canFork).toBe(false);
      expect(res).not.toHaveProperty('noteId');
      expect(res.blocks).toHaveLength(2);
      expect(res.blocks[0]?.noteId).toBe('AbCdEf123456');

      const mediaBlock = res.blocks[1];
      expect(mediaBlock?.type).toBe('media');
      if (mediaBlock?.type === 'media') {
        expect(mediaBlock.content).toEqual([
          {
            id: 'm-1',
            mediaType: 'image',
            localUri: '',
            url: 'https://cdn.ikeen.app/img.jpg',
          },
        ]);
      }

      expect(prisma.noteShare.update).toHaveBeenCalledWith({
        where: { id: 'share-1' },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('returns 404 for expired, inactive, trashed, or locked-folder shares', async () => {
      prisma.noteShare.findUnique.mockResolvedValueOnce(
        makePublicShareRow({ isActive: false }),
      );
      await expect(service.getPublicShare('AbCdEf123456')).rejects.toThrow(
        NotFoundException,
      );

      prisma.noteShare.findUnique.mockResolvedValueOnce(
        makePublicShareRow({ expiresAt: pastDate }),
      );
      await expect(service.getPublicShare('AbCdEf123456')).rejects.toThrow(
        NotFoundException,
      );

      const trashed = makePublicShareRow();
      trashed.note.deletedAt = now;
      prisma.noteShare.findUnique.mockResolvedValueOnce(trashed);
      await expect(service.getPublicShare('AbCdEf123456')).rejects.toThrow(
        NotFoundException,
      );

      const locked = makePublicShareRow();
      locked.note.folder = { isLocked: true };
      prisma.noteShare.findUnique.mockResolvedValueOnce(locked);
      await expect(service.getPublicShare('AbCdEf123456')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns 401 with requiresPassword when locked and no valid unlock token is provided', async () => {
      prisma.noteShare.findUnique.mockResolvedValue(
        makePublicShareRow({ passwordHash: 'hashed' }),
      );

      await expect(service.getPublicShare('AbCdEf123456')).rejects.toMatchObject(
        {
          response: {
            requiresPassword: true,
            slug: 'AbCdEf123456',
          },
        },
      );
    });

    it('allows access to password-protected share with a valid unlock JWT', async () => {
      prisma.noteShare.findUnique.mockResolvedValue(
        makePublicShareRow({ passwordHash: 'hashed' }),
      );
      prisma.noteShare.update.mockResolvedValue(makeShareRow({ viewCount: 1 }));
      jwtService.verify.mockReturnValue({
        sub: 'share-1',
        slug: 'AbCdEf123456',
        type: 'share_unlock',
        v: now.getTime(),
      });

      const res = await service.getPublicShare('AbCdEf123456', 'valid-jwt');
      expect(res.title).toBe('Shared Roadmap');
    });
  });

  describe('unlockShare', () => {
    it('verifies passcode via bcrypt and returns a signed unlock token', async () => {
      const hash = await bcrypt.hash('my-passcode', 4);
      prisma.noteShare.findUnique.mockResolvedValue(
        makePublicShareRow({ passwordHash: hash }),
      );

      const res = await service.unlockShare('AbCdEf123456', 'my-passcode');
      expect(res).toEqual({ token: 'signed-unlock-jwt', expiresIn: 3600 });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: 'share-1',
          slug: 'AbCdEf123456',
          type: 'share_unlock',
          v: now.getTime(),
        },
        { expiresIn: 3600 },
      );

      await expect(
        service.unlockShare('AbCdEf123456', 'wrong-passcode'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forkShare', () => {
    it('rejects forking when access is view-only', async () => {
      prisma.noteShare.findUnique.mockResolvedValue(
        makePublicShareRow({ access: 'view' }),
      );

      await expect(
        service.forkShare('recipient-1', 'AbCdEf123456'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('transactionally clones note and sanitized blocks when access is copy', async () => {
      prisma.noteShare.findUnique.mockResolvedValue(
        makePublicShareRow({ access: 'copy' }),
      );
      prisma.note.create.mockResolvedValue({
        id: 'forked-note-1',
        title: 'Shared Roadmap',
      });
      prisma.noteBlock.createMany.mockResolvedValue({ count: 2 });

      const res = await service.forkShare('recipient-1', 'AbCdEf123456');

      expect(res).toEqual({
        noteId: 'forked-note-1',
        title: 'Shared Roadmap',
      });
      expect(prisma.note.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'recipient-1',
          folderId: null,
          title: 'Shared Roadmap',
          tags: ['product'],
        }),
      });
      expect(prisma.noteBlock.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            noteId: 'forked-note-1',
            type: 'text',
            position: 0,
            content: 'Hello world',
          }),
          expect.objectContaining({
            noteId: 'forked-note-1',
            type: 'media',
            position: 1,
            content: [
              {
                id: 'm-1',
                mediaType: 'image',
                localUri: '',
                url: 'https://cdn.ikeen.app/img.jpg',
              },
            ],
          }),
        ],
      });
    });
  });
});
