import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiKeyService } from '../../auth/api-key.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EnvService } from '../../../config/env.service.js';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  mcpClient?: string;
}

@Injectable()
export class McpAuthGuard implements CanActivate {
  private readonly logger = new Logger(McpAuthGuard.name);

  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = this.extractRequest(context);
    if (!req) {
      throw new UnauthorizedException('HTTP Request context unavailable in MCP handler');
    }

    // Extract authorization header or x-api-key
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const apiKeyHeader = req.headers['x-api-key'] || req.headers['X-Api-Key'] || req.headers['X-API-KEY'];

    let rawToken: string | undefined;

    if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
      rawToken = apiKeyHeader.trim();
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice(7).trim();
    }

    if (!rawToken) {
      this.setAuthenticateHeader(context);
      throw new UnauthorizedException(
        'Missing authentication. Provide "Authorization: Bearer <token>" or "x-api-key: <key>".',
      );
    }

    // 1. Personal Access Token (ikn_...)
    if (rawToken.startsWith('ikn_')) {
      try {
        const user = await this.apiKeyService.validateApiKey(rawToken);
        req.user = user;
        req.mcpClient = (req.headers['x-mcp-client'] as string) || 'mcp-client';
        return true;
      } catch (err) {
        this.setAuthenticateHeader(context);
        if (err instanceof UnauthorizedException) {
          throw err;
        }
        throw new UnauthorizedException('Invalid or expired Personal Access Token');
      }
    }

    // 2. Reject JWT tokens on MCP endpoint by default (PAT only requirement per MCP RFC 8707)
    if (!this.env.MCP_ALLOW_APP_JWT) {
      this.setAuthenticateHeader(context);
      throw new UnauthorizedException(
        'JWT tokens are not accepted for MCP endpoints. Use a Personal Access Token (ikn_...).',
      );
    }

    // 3. Fallback: JWT Bearer token only if MCP_ALLOW_APP_JWT is explicitly enabled
    try {
      const payload = await this.jwtService.verifyAsync(rawToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      });

      if (!user || user.status !== 'active') {
        this.setAuthenticateHeader(context);
        throw new UnauthorizedException('User account is invalid or inactive');
      }

      req.user = user;
      req.mcpClient = (req.headers['x-mcp-client'] as string) || 'jwt-client';
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.setAuthenticateHeader(context);
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  private setAuthenticateHeader(context: ExecutionContext): void {
    const httpRes = context.switchToHttp().getResponse();
    if (httpRes && typeof httpRes.setHeader === 'function') {
      const metadataUrl = `${this.env.API_URL.replace(/\/$/, '')}/.well-known/oauth-protected-resource/mcp`;
      httpRes.setHeader(
        'WWW-Authenticate',
        `Bearer realm="ikeen", resource_metadata="${metadataUrl}", scope="notes:read notes:write folders:read folders:write"`,
      );
      httpRes.setHeader('Cache-Control', 'no-store');
    }
  }

  private extractRequest(context: ExecutionContext): AuthenticatedRequest | null {
    // 1. Direct HTTP context
    const httpReq = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (httpReq && httpReq.headers) {
      return httpReq;
    }

    // 2. Microservice context (RPC / @Ctx() McpContext)
    const rpcContext = context.switchToRpc().getContext();
    if (rpcContext && typeof rpcContext.getRawRequest === 'function') {
      return rpcContext.getRawRequest() as AuthenticatedRequest;
    }

    return null;
  }
}
