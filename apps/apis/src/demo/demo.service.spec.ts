import { Test, TestingModule } from '@nestjs/testing';
import { DemoService } from './demo.service';

describe('DemoService', () => {
  let service: DemoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DemoService],
    }).compile();

    service = module.get<DemoService>(DemoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should test @repo/utils functionality', () => {
    const res = service.testUtils();
    expect(res.status).toBe('ok');
    expect(res.capitalized).toBe('Demo internal packages integration test');
    expect(res.slugified).toBe('demo-internal-packages-integration-test');
  });

  it('should test @repo/types contract', () => {
    const res = service.testTypes();
    expect(res.status).toBe('ok');
    expect(res.mockFolder.name).toBe('Test Folder');
    expect(res.changes.name).toBe('Updated Folder');
  });

  it('should test @repo/db method without unhandled exception', async () => {
    const res = await service.testDb();
    expect(res).toHaveProperty('status');
  });
});
