import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { EnvService } from '../config/env.service.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public readonly prisma: PrismaClient;
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly env: EnvService) {
    const connectionString = this.env.DATABASE_URL;

    const isProd = this.env.isProduction;

    const adapter = new PrismaPg({
      connectionString,
      ssl: isProd ? { rejectUnauthorized: true } : false,
    });

    this.prisma = new PrismaClient({ adapter });
  }

  // Direct delegation helper if you prefer this.prisma.user syntax
  get user() {
    return this.prisma.user;
  }
  get auth() {
    return this.prisma.auth;
  }
  get folder() {
    return this.prisma.folder;
  }
  get note() {
    return this.prisma.note;
  }
  get syncLog() {
    return this.prisma.syncLog;
  }
  get auditLog() {
    return this.prisma.auditLog;
  }
  get chatConversation() {
    return this.prisma.chatConversation;
  }
  get chatMessage() {
    return this.prisma.chatMessage;
  }
  get chatMemory() {
    return this.prisma.chatMemory;
  }
  get chatConversationData() {
    return this.prisma.chatConversationData;
  }
  get apiKey() {
    return this.prisma.apiKey;
  }

  get client() {
    return this.prisma;
  }
  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connection successfully established.');
    } catch (error) {
      this.logger.error('Failed to connect to the database on boot', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // In serverless, avoid closing the pool explicitly on destroy to let warm instances reuse it
    if (!this.env.isProduction) {
      await this.prisma.$disconnect();
      this.logger.log('Database connection disconnected cleanly.');
    }
  }
}
