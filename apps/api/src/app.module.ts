import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { SyncModule } from './modules/sync/sync.module';
import { AblyModule } from './modules/ably/ably.module';
import { FoldersModule } from './modules/folders/folders.module';
import { NotesModule } from './modules/notes/notes.module';
import { HttpLoggerMiddleware } from './common/middleware/http-logger.middleware';

@Module({
  imports: [
    PrismaModule,
    AblyModule,
    FoldersModule,
    NotesModule,
    AuthModule,
    SyncModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('{*path}');
  }
}
