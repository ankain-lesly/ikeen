import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { EnvService } from './config/env.service.js';

let cachedServer: any;

/**
 * Initializes the NestJS app as an HTTP handler (for SSR/serverless).
 */
export async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule);

    setupApp(app);

    await app.init();
    cachedServer = app.getHttpAdapter().getInstance();
  }
  return cachedServer;
}

function setupApp(app: INestApplication) {
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

/**
 * Serverless HTTP handler
 */
export default async function handler(req: Request, res: Response) {
  const server = await bootstrap();
  return server(req, res);
}

/**
 * Standalone execution for local development / Docker
 */
if (process.env.NODE_ENV === 'development') {
  (async () => {
    const app = await NestFactory.create(AppModule);
    setupApp(app);
    const env = app.get(EnvService);
    await app.listen(env.PORT);
  })();
}