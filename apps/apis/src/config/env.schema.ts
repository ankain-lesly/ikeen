import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().optional(),

  // Auth & Security
  JWT_SECRET: z.string().default('ikeen-jwt-secret-dev-2026'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Realtime (Ably)
  ABLY_API_KEY: z.string().optional(),

  // AI & Agent
  AI_PROVIDER: z.enum(['openrouter', 'openai']).default('openrouter'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_CHAT_MODEL: z.string().default('google/gemini-2.5-flash'),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`\n❌ Invalid Environment Configuration:\n${formattedErrors}\n`);
  }

  return result.data;
}
