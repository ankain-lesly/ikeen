import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
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
  const env = app.get(EnvService);
  const allowedOrigins = env.mcpAllowedOrigins;

  app.enableCors({
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });

  // Set prefix but preserve the base root path '/', MCP endpoints, and RFC discovery paths
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: '/mcp', method: RequestMethod.ALL },
      { path: '/mcp/(.*)', method: RequestMethod.ALL },
      { path: '/.well-known/(.*)', method: RequestMethod.ALL },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}

/**
 * Serverless HTTP handler for Vercel
 */
export default async function handler(req: Request, res: Response) {
  const server = await bootstrap();
  return server(req, res);
}

/**
 * Standalone execution for local development / Docker / non-Vercel runtimes
 */
if (!process.env.VERCEL) {
  (async () => {
    const app = await NestFactory.create(AppModule);
    setupApp(app);
    const env = app.get(EnvService);
    await app.listen(env.PORT);
  })();
}