import { Injectable } from '@nestjs/common';
import { Folder, FolderChanges } from '@repo/types/folders';
import { log, capitalize, slugify, truncate } from '@repo/utils';
import { prisma } from '@repo/db';

@Injectable()
export class DemoService {
  testUtils() {
    const raw = 'demo internal packages integration test';
    return {
      status: 'ok',
      original: raw,
      capitalized: capitalize(raw),
      slugified: slugify(raw),
      truncated: truncate(raw, 15),
    };
  }

  testTypes(): { status: string; mockFolder: Folder; changes: FolderChanges } {
    const mockFolder: Folder = {
      id: 'demo-folder-1',
      name: 'Test Folder',
      color: '#3B82F6',
      icon: 'folder',
      isLocked: false,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const changes: FolderChanges = {
      name: 'Updated Folder',
    };

    return {
      status: 'ok',
      mockFolder,
      changes,
    };
  }

  async testDb() {
    try {
      const userCount = await prisma.user.count();
      // const userCount = await Promise.resolve(0);
      return {
        status: 'ok',
        connected: true,
        userCount,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        status: 'db_connection_attempted',
        connected: false,
        message: errorMessage,
      };
    }
  }

  async testAll() {
    const data = {
      utils: this.testUtils(),
      types: this.testTypes(),
      db: await this.testDb(),
    };

    log('Log@ialldata', data);
    return data;
  }
}
