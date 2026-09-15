import { config } from "dotenv";
import { z } from "zod";

// Load environment variables from .env
config({ quiet: true });

/**
 * Maps directly to core app .env variables. Update when .env or infra changes.
 * Only validate/require values actually present in .env or used at runtime.
 */
const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(["development", "production", "preview"]),
  PORT: z.coerce.number(),

  // App Info
  APP_NAME: z.string(),
  APP_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRATION: z.string(),
  JWT_REFRESH_EXPIRATION: z.string(),
  JWT_VERIFICATION_EXPIRATION: z.string(),
  JWT_RESET_PASSWORD_EXPIRATION: z.string(),

  // Email (no SMTP in .env by default)
  EMAIL_FROM: z.string(),
  EMAIL_SUPPORT: z.string(),

  // Cloudinary and Uploads
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Resend / Email API
  RESEND_API_KEY: z.string().optional(),

  // CORS (optional, universal)
  CORS_ORIGINS: z.string().default("*"),


  // NODEMAILER (optional)
  EMAIL_SMTP_HOST: z.string().optional(),
  EMAIL_SMTP_PORT: z.coerce.number().optional(),
  EMAIL_SMTP_USERNAME: z.string().optional(),
  EMAIL_SMTP_PASSWORD: z.string().optional(),
  EMAIL_SMTP_SECURE: z.boolean().optional(),
  EMAIL_SMTP_SERVICE: z.string().optional(),
  EMAIL_SMTP_AUTH_USER: z.string().optional(),
  EMAIL_SMTP_AUTH_PASS: z.string().optional(),
  EMAIL_SMTP_AUTH_METHOD: z.string().optional(),
});

const env = envSchema.parse({
  ...process.env,
  NODE_ENV: process.env.APP_NODE_ENV ?? process.env.NODE_ENV,
});

export const IS_PROD = env.NODE_ENV === "production";
export const IS_DEV = env.NODE_ENV === "development";

export default env;
