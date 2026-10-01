import { tool } from 'ai';
import { z } from 'zod';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';

const baseContextSchema = z.object({
  userId: z.string(),
  conversationId: z.string(),
});

export const MEMORY_CATEGORIES = [
  'PREFERENCE',
  'GOAL',
  'HABIT',
  'BREAKTHROUGH',
  'FEEDBACK',
] as const;

export function createMemoryTools({
  prisma,
  audit,
}: {
  prisma: PrismaService;
  audit: AuditService;
}) {
  const recordMemory = tool({
    description:
      'Autonomously persist a valuable insight, preference, enduring goal, or breakthrough about the user to maintain continuity.',
    contextSchema: baseContextSchema,
    inputSchema: z.object({
      category: z
        .enum(MEMORY_CATEGORIES)
        .describe(
          'Category: PREFERENCE | GOAL | HABIT | BREAKTHROUGH | FEEDBACK',
        ),
      description: z
        .string()
        .trim()
        .min(3)
        .describe(
          'Specific, concise summary of the insight, preference, or goal',
        ),
      importance: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(3)
        .describe(
          'Importance level: 1 = minor note, 3 = helpful insight, 5 = critical foundational goal/preference',
        ),
    }),
    execute: async ({ category, description, importance }, { context }) => {
      try {
        const entry = await prisma.chatMemory.create({
          data: {
            userId: context.userId,
            conversationId: context.conversationId,
            category,
            description: description.trim(),
            importance: Math.min(Math.max(importance, 1), 5),
          },
        });

        audit.logAgent({
          userId: context.userId,
          conversationId: context.conversationId,
          action: 'agent.recordMemory',
          resourceType: 'memory',
          resourceId: entry.id,
          details: `Recorded ${category} memory`,
          metadata: { category, importance },
        });

        return {
          ok: true,
          memoryId: entry.id,
          category,
          importance,
        };
      } catch (err: unknown) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, error };
      }
    },
  });

  return {
    recordMemory,
  };
}
