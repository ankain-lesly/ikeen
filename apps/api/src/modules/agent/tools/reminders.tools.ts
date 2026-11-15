import { tool } from 'ai';
import { RemindersToolService } from '../../reminders/reminders-tool.service.js';
import type { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuditService } from '../../audit/audit.service.js';
import { ikeenAgentCallOptionsSchema as contextSchema } from '../call-options.js';
import {
  cancelReminderDef,
  completeReminderDef,
  listRemindersDef,
  setReminderDef,
} from '../../reminders/reminders.tool-definitions.js';

const agentOpts = (conversationId: string) => ({
  conversationId,
  source: 'agent' as const,
});

export function createReminderTools(params: {
  remindersToolService?: RemindersToolService;
  prisma: PrismaService;
  audit: AuditService;
}) {
  const svc =
    params.remindersToolService ??
    new RemindersToolService(params.prisma, params.audit);

  return {
    setReminder: tool({
      ...setReminderDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.setReminder(context.userId, args, agentOpts(context.conversationId)),
    }),
    listReminders: tool({
      ...listRemindersDef,
      contextSchema,
      execute: (args, { context }) => svc.listReminders(context.userId, args),
    }),
    completeReminder: tool({
      ...completeReminderDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.completeReminder(
          context.userId,
          args,
          agentOpts(context.conversationId),
        ),
    }),
    cancelReminder: tool({
      ...cancelReminderDef,
      contextSchema,
      execute: (args, { context }) =>
        svc.cancelReminder(
          context.userId,
          args,
          agentOpts(context.conversationId),
        ),
    }),
  };
}
