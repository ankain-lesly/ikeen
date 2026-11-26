import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SyncModule } from './modules/sync/sync.module.js';
import { AblyModule } from './modules/ably/ably.module.js';
import { FoldersModule } from './modules/folders/folders.module.js';
import { NotesModule } from './modules/notes/notes.module.js';
import { SharesModule } from './modules/shares/shares.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { AgentModule } from './modules/agent/agent.module.js';
import { McpModule } from './modules/mcp/mcp.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware.js';
import { EnvModule } from './config/env.module.js';

@Module({
  imports: [
    EnvModule,
    PrismaModule,
    AuditModule,
    AblyModule,
    FoldersModule,
    NotesModule,
    SharesModule,
    MediaModule,
    AuthModule,
    SyncModule,
    NotificationsModule,
    AgentModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('{*path}');
  }
}
