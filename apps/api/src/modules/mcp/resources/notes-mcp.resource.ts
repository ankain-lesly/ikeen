import { UseGuards } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import {
  McpController,
  McpRawRequest,
  Resource,
  ResourceTemplate,
} from '@rekog/mcp-nest';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { McpAuthGuard, type AuthenticatedRequest } from '../guards/mcp-auth.guard.js';

@McpController()
@UseGuards(McpAuthGuard)
export class NotesMcpResource {
  constructor(private readonly prisma: PrismaService) {}

  @Resource({
    name: 'recent-notes',
    description: 'Returns the most recently modified active notes in the workspace',
    mimeType: 'application/json',
    uri: 'ikeen://notes/recent',
  })
  async getRecentNotes(
    @Payload() { uri }: { uri: string },
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    const notes = await this.prisma.note.findMany({
      where: {
        userId: req.user.id,
        deletedAt: null,
        isArchived: false,
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        folderId: true,
        isPinned: true,
        updatedAt: true,
      },
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      take: 15,
    });

    const mapped = notes.map((n) => {
      const isTruncated = n.content.trim().length > 280;
      return {
        ...n,
        content: isTruncated
          ? `${n.content.trim().slice(0, 280)}… [truncated]`
          : n.content.trim(),
        isTruncated,
      };
    });

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(mapped, null, 2),
        },
      ],
    };
  }

  @ResourceTemplate({
    name: 'note-content',
    description: 'Returns the raw markdown body and metadata of a specific note',
    mimeType: 'text/markdown',
    uriTemplate: 'ikeen://notes/{noteId}',
  })
  async getNoteContent(
    @Payload() { uri, noteId }: { uri: string; noteId: string },
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    const note = await this.prisma.note.findFirst({
      where: {
        id: noteId,
        userId: req.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        content: true,
        tags: true,
        updatedAt: true,
      },
    });

    if (!note) {
      return {
        contents: [
          {
            uri,
            mimeType: 'text/markdown',
            text: '# Note Not Found\n\nThe requested note was not found or was deleted.',
          },
        ],
      };
    }

    const header = `---\ntitle: ${note.title}\nid: ${note.id}\ntags: ${note.tags.join(', ')}\nupdatedAt: ${note.updatedAt.toISOString()}\n---\n\n`;
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: `${header}# ${note.title}\n\n${note.content}`,
        },
      ],
    };
  }

  @ResourceTemplate({
    name: 'folder-overview',
    description: 'Returns folder details and all notes inside the specified folder',
    mimeType: 'application/json',
    uriTemplate: 'ikeen://folders/{folderId}',
  })
  async getFolderOverview(
    @Payload() { uri, folderId }: { uri: string; folderId: string },
    @McpRawRequest() req: AuthenticatedRequest,
  ) {
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId: req.user.id,
        deletedAt: null,
      },
      include: {
        notes: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            tags: true,
            isPinned: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!folder) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ error: 'Folder not found' }),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(folder, null, 2),
        },
      ],
    };
  }
}
