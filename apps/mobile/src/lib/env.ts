import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.url(),
});

export const env = envSchema.parse({
  API_URL: process.env.EXPO_PUBLIC_API_URL || "http://192.168.40.4:3001/api/v1",
});
