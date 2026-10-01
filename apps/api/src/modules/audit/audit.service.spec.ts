import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AuditService', () => {
  it('inserts a successful audit row', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'audit-1' });
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: { auditLog: { create } } },
      ],
    }).compile();

    const service = module.get(AuditService);
    await service.log({
      userId: 'user-1',
      action: 'agent.createNote',
      details: 'Created note',
      resourceType: 'note',
      resourceId: 'note-1',
      isSystem: true,
      metadata: { source: 'ikeen-agent', conversationId: 'conv-1' },
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'agent.createNote',
        severity: 'INFO',
        resourceType: 'note',
        resourceId: 'note-1',
        details: 'Created note',
        isSystem: true,
        success: true,
      }),
    });
  });

  it('swallows create failures without throwing', async () => {
    const create = vi.fn().mockRejectedValue(new Error('db down'));
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: { auditLog: { create } } },
      ],
    }).compile();

    const service = module.get(AuditService);
    await expect(
      service.log({ action: 'agent.createNote', details: 'Created note' }),
    ).resolves.toBeUndefined();
  });

  it('fire-and-forget logAgent marks the row as system-originated', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'audit-1' });
    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: { auditLog: { create } } },
      ],
    }).compile();

    const service = module.get(AuditService);
    service.logAgent({
      userId: 'user-1',
      conversationId: 'conv-1',
      action: 'agent.replaceNote',
      details: 'Replaced content',
      severity: 'WARN',
      resourceType: 'note',
      resourceId: 'note-1',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'agent.replaceNote',
        severity: 'WARN',
        isSystem: true,
        metadata: expect.objectContaining({
          source: 'ikeen-agent',
          conversationId: 'conv-1',
        }),
      }),
    });
  });
});
