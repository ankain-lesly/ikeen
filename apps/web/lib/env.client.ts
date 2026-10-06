import { z } from "zod";
// import { config as loadEnv } from "dotenv";

// loadEnv({ path: ".env.local" });
// loadEnv();

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

// xenv exposes client-safe environment variables, validated at runtime with zod.
// Only NEXT_PUBLIC_* variables should be accessed here, corresponding with those prefixed in your .env or deployment environment.
export const xenv = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
