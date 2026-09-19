import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@repo/db';
import type { PrismaClient } from '@repo/db';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  get user() {
    return prisma.user;
  }

  get auth() {
    return prisma.auth;
  }

  get client(): PrismaClient {
    return prisma;
  }

  async onModuleInit() {
    // Database connection active
  }

  async onModuleDestroy() {
    // Teardown connections if needed
  }
}
