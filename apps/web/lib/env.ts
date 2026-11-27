import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "preview", "production"])
    .default("development"),

  // Set Vercel env vars (for /.well-known/*):
  APPLE_TEAM_ID: z.string().nullable(),
  IOS_BUNDLE_ID: z.string().nullable(),
  ANDROID_PACKAGE_NAME: z.string().default("com.techforgelee.ikeen"),
  ANDROID_SHA256_CERT_FINGERPRINTS: z.string().nullable(),
});

const env = envSchema.parse({
  // General
  NODE_ENV: process.env.NODE_ENV,

  // Set Vercel env vars (for /.well-known/*):
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID,
  IOS_BUNDLE_ID: process.env.IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME: process.env.ANDROID_PACKAGE_NAME,
  ANDROID_SHA256_CERT_FINGERPRINTS: process.env.ANDROID_SHA256_CERT_FINGERPRINTS,
});

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const isPrev = env.NODE_ENV === "preview";

export { env };
