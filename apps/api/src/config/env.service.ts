import { Injectable } from '@nestjs/common';
import { type EnvConfig, validateEnv } from './env.schema.js';

@Injectable()
export class EnvService implements EnvConfig {
  readonly NODE_ENV: 'development' | 'production' | 'test';
  readonly PORT: number;
  readonly DATABASE_URL?: string;
  readonly JWT_SECRET: string;
  readonly JWT_EXPIRES_IN: string;
  readonly ABLY_API_KEY?: string;
  readonly AI_PROVIDER: 'openrouter' | 'openai';
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENAI_API_KEY?: string;
  readonly AI_CHAT_MODEL: string;
  readonly AI_EMBEDDING_MODEL: string;
  readonly AGENT_MAX_STEPS: number;
  readonly TAVILY_API_KEY: string;
  readonly COMPOSIO_API_KEY: string;
  readonly APP_MIN_REQUIRED_VERSION: string;
  readonly APP_UPDATE_MANDATORY: boolean;
  readonly APP_UPDATE_URL_ANDROID?: string;
  readonly APP_UPDATE_URL_IOS?: string;
  readonly SITE_URL: string;
  readonly API_URL: string;
  readonly MCP_ALLOWED_ORIGINS?: string;
  readonly MCP_ALLOW_APP_JWT: boolean;

  constructor() {
    const validated = validateEnv(process.env);
    Object.assign(this, validated);
  }

  get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.NODE_ENV === 'test';
  }

  get mcpAllowedOrigins(): string[] | undefined {
    if (!this.MCP_ALLOWED_ORIGINS) return undefined;
    return this.MCP_ALLOWED_ORIGINS.split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  getMcpResourceUrl(): string {
    return `${this.API_URL.replace(/\/$/, '')}/mcp`;
  }

  getMcpDocsUrl(): string {
    // return `${this.SITE_URL.replace(/\/$/, '')}/docs/mcp`;
    return `${this.SITE_URL.replace(/\/$/, '')}/mcp`;
  }
}
