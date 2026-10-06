import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MCP_STRATEGY, type McpStrategy } from '@rekog/mcp-nest';
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
    await setupMcp(app);

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

async function setupMcp(app: INestApplication) {
  const mcp = app.get<McpStrategy>(MCP_STRATEGY);
  mcp.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcp });
  await app.startAllMicroservices();
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
    await setupMcp(app);
    const env = app.get(EnvService);
    await app.listen(env.PORT);
  })();
}