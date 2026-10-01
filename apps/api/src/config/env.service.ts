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
  readonly APP_MIN_REQUIRED_VERSION: string;
  readonly APP_UPDATE_MANDATORY: boolean;
  readonly APP_UPDATE_URL_ANDROID?: string;
  readonly APP_UPDATE_URL_IOS?: string;

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
}
