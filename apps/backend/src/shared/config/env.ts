import { config } from "dotenv";
import { z } from "zod";

// Load environment variables
config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "preview"])
    .default("development"),
  PORT: z.string().transform(Number).default(8383),
  CORS_ORIGINS: z.string().default("*"),

  // Database
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRATION: z.string().default("1d"),
  JWT_REFRESH_EXPIRATION: z.string().default("7d"),
  JWT_VERIFICATION_EXPIRATION: z.string().default("1d"),
  JWT_RESET_PASSWORD_EXPIRATION: z.string().default("10m"),

  // Email
  EMAIL_SMTP_HOST: z.string().min(1),
  EMAIL_SMTP_PORT: z.string().transform(Number).default(3434),
  EMAIL_SMTP_USERNAME: z.string().min(1),
  EMAIL_SMTP_PASSWORD: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  EMAIL_SUPPORT: z.string().min(1),

  // App Info
  APP_NAME: z.string().min(1),
  APP_URL: z.string().url({ message: "App URL is required" }),

  // Cloudinary and Uploads
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  DEPLOYMENT_PLATFORM: z.enum(["render", "vercel"]),

  // Resend
  RESEND_API_KEY: z.string().min(1),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_OTP_SERVICE: z.string().min(1),
  TWILIO_VIRTUAL_PHONE_NUMBER: z.string().min(1),
  TWILIO_PHONE_NUMBER: z.string().min(1),

  // Inngest — background job & event platform
  INNGEST_DEV: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().default("local"),
  INNGEST_SIGNING_KEY: z.string().default("local"),

  // Anthropic API Key
  ANTHROPIC_API_KEY: z.string().min(1),

  // Expo
  EXPO_ACCESS_TOKEN: z.string().min(1),

  // pawaPay
  PAWAPAY_API_URL: z
    .string()
    .url()
    .default("https://api.sandbox.pawapay.io"),
  PAWAPAY_API_TOKEN: z.string().optional(),
  PAWAPAY_CALLBACK_IP_VERIFY: z.string().optional(),
});

const env = envSchema.parse({
  ...process.env,
  NODE_ENV: process.env.APP_NODE_ENV ?? process.env.NODE_ENV,
});

export const IS_PROD = env.NODE_ENV === "production";
export const IS_DEV = env.NODE_ENV === "development";

export default env;
