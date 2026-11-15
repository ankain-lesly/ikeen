import { Injectable, Logger, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PushNotificationService } from '../notifications/push-notification.service.js';
import { toolFailure } from '../agent/call-options.js';
import type { ToolExecutionOptions } from '../notes/notes-tool.service.js';
import type {
  cancelReminderDef,
  completeReminderDef,
  listRemindersDef,
  setReminderDef,
} from './reminders.tool-definitions.js';

@Injectable()
export class RemindersToolService {
  private readonly logger = new Logger(RemindersToolService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Optional() private readonly pushService?: PushNotificationService,
  ) {}

  private recordReminderAudit(
    userId: string,
    toolAction: string,
    resourceId: string,
    details: string,
    options?: ToolExecutionOptions,
    extra?: {
      severity?: 'INFO' | 'WARN';
      changes?: Record<string, { old: unknown; new: unknown }>;
      metadata?: Record<string, unknown>;
    },
  ) {
    const source = options?.source ?? 'agent';
    this.audit.logAgent({
      userId,
      conversationId: options?.conversationId ?? `${source}-${userId}`,
      action: `${source === 'mcp' ? 'mcp' : 'agent'}.${toolAction}`,
      ...(extra?.severity ? { severity: extra.severity } : {}),
      resourceType: 'reminder',
      resourceId,
      details,
      ...(extra?.changes ? { changes: extra.changes } : {}),
      metadata: {
        ...extra?.metadata,
        source,
        clientId: options?.clientId,
        apiKey: options?.apiKey,
      },
    });
  }

  async setReminder(
    userId: string,
    args: z.infer<typeof setReminderDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    const note = await this.prisma.note.findFirst({
      where: { id: args.noteId, userId, deletedAt: null },
      select: { id: true, title: true },
    });

    if (!note) {
      return toolFailure(
        `Note with id "${args.noteId}" not found or does not belong to user.`,
        'NOTE_NOT_FOUND',
      );
    }

    const dueAtDate = new Date(args.dueAt);
    if (isNaN(dueAtDate.getTime())) {
      return toolFailure(
        `Invalid dueAt timestamp "${args.dueAt}". Please provide a valid ISO 8601 string.`,
        'INVALID_TIMESTAMP',
      );
    }

    // Check if there is an existing active reminder for this note
    const existing = await this.prisma.reminder.findFirst({
      where: {
        noteId: note.id,
        userId,
        deletedAt: null,
        isCompleted: false,
      },
    });

    const now = new Date();
    const title = args.title?.trim() || note.title || 'Note Reminder';

    let reminder: {
      id: string;
      noteId: string | null;
      title: string;
      dueAt: Date;
      repeat: any;
      isCompleted: boolean;
    };
    if (existing) {
      reminder = await this.prisma.reminder.update({
        where: { id: existing.id },
        data: {
          title,
          dueAt: dueAtDate,
          repeat: args.repeat ?? 'none',
          isCompleted: false,
          updatedAt: now,
        },
      });

      this.recordReminderAudit(
        userId,
        'updateReminder',
        reminder.id,
        `Updated reminder for note "${note.title}" to ${dueAtDate.toISOString()}`,
        options,
        {
          changes: {
            dueAt: { old: existing.dueAt.toISOString(), new: dueAtDate.toISOString() },
            title: { old: existing.title, new: title },
          },
        },
      );
    } else {
      const id = randomUUID();
      reminder = await this.prisma.reminder.create({
        data: {
          id,
          userId,
          noteId: note.id,
          title,
          dueAt: dueAtDate,
          repeat: args.repeat ?? 'none',
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
        },
      });

      this.recordReminderAudit(
        userId,
        'setReminder',
        reminder.id,
        `Created reminder for note "${note.title}" due at ${dueAtDate.toISOString()}`,
        options,
      );

      if (this.pushService) {
        const source = options?.source ?? 'agent';
        await this.pushService
          .sendAgentEntityCreatedPush(userId, {
            entity: 'reminder',
            entityId: reminder.id,
            title: source === 'mcp' ? 'New Reminder from MCP' : 'New Reminder from AI Assistant',
            body: `Scheduled reminder for "${note.title || 'Note'}" on ${dueAtDate.toLocaleDateString()}`,
            source,
            data: {
              reminderId: reminder.id,
              noteId: reminder.noteId,
              dueAt: reminder.dueAt.toISOString(),
            },
          })
          .catch((err) => {
            this.logger.warn(`Failed to dispatch creation push notification for reminder ${reminder.id}:`, err);
          });
      }
    }

    return {
      ok: true,
      action: existing ? 'updated' : 'created',
      reminder: {
        id: reminder.id,
        noteId: reminder.noteId,
        noteTitle: note.title,
        title: reminder.title,
        dueAt: reminder.dueAt.toISOString(),
        repeat: reminder.repeat,
        isCompleted: reminder.isCompleted,
      },
    };
  }

  async listReminders(
    userId: string,
    args: z.infer<typeof listRemindersDef.inputSchema>,
  ) {
    const where: any = {
      userId,
      deletedAt: null,
    };

    if (args.noteId) {
      where.noteId = args.noteId;
    }

    if (!args.includeCompleted) {
      where.isCompleted = false;
    }

    if (args.upcomingOnly) {
      where.dueAt = { gte: new Date() };
    }

    const items = await this.prisma.reminder.findMany({
      where,
      orderBy: { dueAt: 'asc' },
      take: args.limit ?? 20,
      include: {
        note: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return {
      ok: true,
      count: items.length,
      reminders: items.map((r) => ({
        id: r.id,
        noteId: r.noteId,
        noteTitle: r.note?.title ?? null,
        title: r.title,
        dueAt: r.dueAt.toISOString(),
        repeat: r.repeat,
        isCompleted: r.isCompleted,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async completeReminder(
    userId: string,
    args: z.infer<typeof completeReminderDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    const existing = await this.prisma.reminder.findFirst({
      where: { id: args.reminderId, userId, deletedAt: null },
      include: { note: { select: { title: true } } },
    });

    if (!existing) {
      return toolFailure(
        `Reminder with id "${args.reminderId}" not found or does not belong to user.`,
        'REMINDER_NOT_FOUND',
      );
    }

    const isCompleted = args.isCompleted ?? true;
    const now = new Date();

    const updated = await this.prisma.reminder.update({
      where: { id: existing.id },
      data: {
        isCompleted,
        updatedAt: now,
      },
    });

    this.recordReminderAudit(
      userId,
      'completeReminder',
      updated.id,
      `Marked reminder as ${isCompleted ? 'completed' : 'pending'} for note "${existing.note?.title ?? existing.title}"`,
      options,
      {
        changes: {
          isCompleted: { old: existing.isCompleted, new: isCompleted },
        },
      },
    );

    return {
      ok: true,
      reminderId: updated.id,
      isCompleted: updated.isCompleted,
    };
  }

  async cancelReminder(
    userId: string,
    args: z.infer<typeof cancelReminderDef.inputSchema>,
    options?: ToolExecutionOptions,
  ) {
    const existing = await this.prisma.reminder.findFirst({
      where: { id: args.reminderId, userId, deletedAt: null },
      include: { note: { select: { title: true } } },
    });

    if (!existing) {
      return toolFailure(
        `Reminder with id "${args.reminderId}" not found or does not belong to user.`,
        'REMINDER_NOT_FOUND',
      );
    }

    const now = new Date();
    await this.prisma.reminder.update({
      where: { id: existing.id },
      data: {
        deletedAt: now,
        updatedAt: now,
      },
    });

    this.recordReminderAudit(
      userId,
      'cancelReminder',
      existing.id,
      `Cancelled reminder for note "${existing.note?.title ?? existing.title}"`,
      options,
      { severity: 'WARN' },
    );

    return {
      ok: true,
      cancelled: true,
      reminderId: existing.id,
    };
  }
}
