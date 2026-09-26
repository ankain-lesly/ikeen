import { Test, TestingModule } from '@nestjs/testing';
import { RealtimeController } from './realtime.controller.js';
import { AblyService } from './ably.service.js';

describe('RealtimeController', () => {
  let controller: RealtimeController;
  let mockAblyService: {
    isEnabled: ReturnType<typeof vi.fn>;
    publishEvent: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockAblyService = {
      isEnabled: vi.fn().mockReturnValue(true),
      publishEvent: vi.fn().mockResolvedValue({
        success: true,
        channel: 'user:user-1',
        event: 'sync:invalidate',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RealtimeController],
      providers: [
        {
          provide: AblyService,
          useValue: mockAblyService,
        },
      ],
    }).compile();

    controller = module.get<RealtimeController>(RealtimeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return realtime engine status', () => {
      const status = controller.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.timestamp).toBeDefined();
      expect(mockAblyService.isEnabled).toHaveBeenCalled();
    });
  });

  describe('triggerViaUrl', () => {
    it('should trigger default sync:invalidate event via URL with user id param', async () => {
      const result = await controller.triggerViaUrl('user-1', {});

      expect(mockAblyService.publishEvent).toHaveBeenCalledWith(
        'user-1',
        'sync:invalidate',
        expect.objectContaining({
          entities: ['notes', 'folders'],
          source: 'url_trigger',
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          userId: 'user-1',
          channel: 'user:user-1',
          event: 'sync:invalidate',
        }),
      );
    });

    it('should parse custom entities, event, and message from query params', async () => {
      const result = await controller.triggerViaUrl('user-2', {
        event: 'custom:alert',
        entities: 'notes,tags',
        message: 'New note created',
      });

      expect(mockAblyService.publishEvent).toHaveBeenCalledWith(
        'user-2',
        'custom:alert',
        expect.objectContaining({
          entities: ['notes', 'tags'],
          message: 'New note created',
          source: 'url_trigger',
        }),
      );

      expect(result.userId).toBe('user-2');
    });
  });

  describe('triggerViaPost', () => {
    it('should trigger event with custom body payload', async () => {
      const result = await controller.triggerViaPost('user-1', {
        event: 'notes:updated',
        entities: ['notes'],
        message: 'Sprint plan updated',
        data: { noteId: 'n-123' },
      });

      expect(mockAblyService.publishEvent).toHaveBeenCalledWith(
        'user-1',
        'notes:updated',
        expect.objectContaining({
          entities: ['notes'],
          message: 'Sprint plan updated',
          data: { noteId: 'n-123' },
          source: 'post_trigger',
        }),
      );

      expect(result.userId).toBe('user-1');
    });
  });
});
