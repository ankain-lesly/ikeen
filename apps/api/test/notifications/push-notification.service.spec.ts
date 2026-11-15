import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PushNotificationService } from '../../src/modules/notifications/push-notification.service.js';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      pushToken: {
        upsert: vi.fn().mockImplementation(({ create }) => ({
          id: 'token-id-123',
          ...create,
        })),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([
          { token: 'ExponentPushToken[device-1-token-abc]', deviceId: 'device-1' },
          { token: 'ExponentPushToken[device-2-token-def]', deviceId: 'device-2' },
        ]),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    };

    service = new PushNotificationService(mockPrisma);
  });

  it('registers a valid Expo push token with metadata', async () => {
    const validToken = 'ExponentPushToken[valid-push-token-12345]';

    const result = await service.registerPushToken('user-1', {
      token: validToken,
      platform: 'ios',
      deviceId: 'device-iphone-15',
      deviceName: 'iPhone',
      osVersion: '17.4',
      appVersion: '2.0.1',
      manufacturer: 'Apple',
      model: 'iPhone 15 Pro',
    });

    expect(result.ok).toBe(true);
    expect(result.id).toBe('token-id-123');
    expect(mockPrisma.pushToken.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: validToken },
        create: expect.objectContaining({
          userId: 'user-1',
          token: validToken,
          platform: 'ios',
          deviceId: 'device-iphone-15',
        }),
      }),
    );
  });

  it('rejects an invalid Expo push token format', async () => {
    await expect(
      service.registerPushToken('user-1', {
        token: 'invalid-token-not-expo',
        platform: 'android',
      }),
    ).rejects.toThrow('Invalid Expo push token');
  });

  it('deregisters a push token for a user', async () => {
    const token = 'ExponentPushToken[valid-push-token-12345]';
    const result = await service.deregisterPushToken('user-1', token);

    expect(result.ok).toBe(true);
    expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', token },
    });
  });

  it('dedicated sendPushNotification saves to database and pushes to tokens', async () => {
    const sendSpy = vi.spyOn((service as any).expo, 'sendPushNotificationsAsync').mockResolvedValue([
      { status: 'ok', id: 'ticket-1' },
      { status: 'ok', id: 'ticket-2' },
    ]);

    const res = await service.sendPushNotification({
      userId: 'user-1',
      title: 'Direct Test Title',
      body: 'Direct Test Body',
      data: { testKey: 'testVal' },
      channelId: 'reminders',
    });

    expect(res.ok).toBe(true);
    expect(res.notificationId).toBe('notif-1');
    expect(res.tokensCount).toBe(2);
    expect(res.ticketsCount).toBe(2);

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'Direct Test Title',
          message: 'Direct Test Body',
          channel: 'push',
        }),
      }),
    );

    expect(sendSpy).toHaveBeenCalled();
  });

  it('dedicated sendPushNotification supports saveToDatabase: false', async () => {
    vi.spyOn((service as any).expo, 'sendPushNotificationsAsync').mockResolvedValue([
      { status: 'ok', id: 'ticket-1' },
      { status: 'ok', id: 'ticket-2' },
    ]);

    const res = await service.sendPushNotification({
      userId: 'user-1',
      title: 'Transient Alert',
      body: 'Do not store in DB',
      saveToDatabase: false,
    });

    expect(res.ok).toBe(true);
    expect(res.notificationId).toBeUndefined();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('sends agent entity created push delegating to sendPushNotification', async () => {
    const spy = vi.spyOn(service, 'sendPushNotification').mockResolvedValue({
      ok: true,
      notificationId: 'notif-1',
      tokensCount: 2,
      ticketsCount: 2,
    });

    await service.sendAgentEntityCreatedPush('user-1', {
      entity: 'note',
      entityId: 'note-100',
      title: 'New Note from AI Assistant',
      body: 'Created note: "Meeting Summary"',
      source: 'agent',
      data: { noteId: 'note-100' },
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        title: 'New Note from AI Assistant',
        body: 'Created note: "Meeting Summary"',
        channelId: 'reminders',
        data: expect.objectContaining({
          entity: 'note',
          entityId: 'note-100',
          source: 'agent',
        }),
      }),
    );
  });

  it('prunes dead tokens when Expo returns DeviceNotRegistered error ticket', async () => {
    const deadToken = 'ExponentPushToken[device-1-token-abc]';
    mockPrisma.pushToken.findMany.mockResolvedValue([{ token: deadToken, deviceId: 'device-1' }]);

    vi.spyOn((service as any).expo, 'sendPushNotificationsAsync').mockResolvedValue([
      {
        status: 'error',
        message: 'Device not registered',
        details: { error: 'DeviceNotRegistered' },
      },
    ]);

    await service.sendAgentEntityCreatedPush('user-1', {
      entity: 'folder',
      entityId: 'folder-1',
      title: 'New Folder from MCP',
      body: 'Created folder "Projects"',
      source: 'mcp',
    });

    expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith({
      where: { token: deadToken },
    });
  });
});
