#!/usr/bin/env bun
import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createIkeenMcpServer } from './modules/mcp/ikeen-mcp-server.js';
import { NotesToolService } from './modules/notes/notes-tool.service.js';
import { FoldersToolService } from './modules/folders/folders-tool.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { AuditService } from './modules/audit/audit.service.js';
import { AblyService } from './modules/ably/ably.service.js';
import { EnvService } from './config/env.service.js';
import { ApiKeyService } from './modules/auth/api-key.service.js';

async function main() {
  process.stderr.write('[ikeen-mcp-stdio] Initializing iKeen MCP Server (stdio)...\n');

  const envService = new EnvService();
  if (!envService.DATABASE_URL) {
    process.stderr.write('[ikeen-mcp-stdio] Error: DATABASE_URL environment variable is required.\n');
    process.exit(1);
    return;
  }

  // Set up Prisma and domain services
  const prismaService = new PrismaService(envService);
  await prismaService.onModuleInit();

  const auditService = new AuditService(prismaService);
  const ablyService = new AblyService(envService);

  const notesToolService = new NotesToolService(prismaService, auditService);
  const foldersToolService = new FoldersToolService(prismaService, auditService);
  const apiKeyService = new ApiKeyService(prismaService);

  // Authenticate user via IKEEN_API_KEY or API_KEY
  const apiKey = (process.env.IKEEN_API_KEY || process.env.API_KEY)?.trim();
  if (!apiKey) {
    process.stderr.write(
      '[ikeen-mcp-stdio] Error: IKEEN_API_KEY (or API_KEY) environment variable is required to authenticate.\n',
    );
    process.exit(1);
    return;
  }

  let resolvedUserId: string;
  let resolvedApiKey: { id: string; name: string; keyPrefix: string } | undefined;
  try {
    const { user, apiKey: keyInfo } = await apiKeyService.validateApiKey(apiKey);
    resolvedUserId = user.id;
    resolvedApiKey = keyInfo;
    process.stderr.write(`[ikeen-mcp-stdio] Authenticated successfully as user ${user.id}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[ikeen-mcp-stdio] Authentication failed: ${message}\n`);
    process.exit(1);
    return;
  }

  const server = createIkeenMcpServer({
    notesToolService,
    foldersToolService,
    prisma: prismaService,
    ably: ablyService,
    userId: resolvedUserId,
    clientId: 'claude-desktop-stdio',
    apiKey: resolvedApiKey,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[ikeen-mcp-stdio] iKeen MCP Server is running over stdio.\n');
}

main().catch((err) => {
  process.stderr.write(
    `[ikeen-mcp-stdio] Fatal error: ${err instanceof Error ? err.stack || err.message : String(err)}\n`,
  );
  process.exit(1);
});
