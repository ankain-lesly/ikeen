import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "preview", "production"])
      .default("development"),
  })

const env = envSchema.parse({
  // General
  NODE_ENV: process.env.NODE_ENV,
});

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const isPrev = env.NODE_ENV === "preview";

export { env };