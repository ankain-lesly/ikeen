import { z } from 'zod';

const envSchema = z.object({
  API_URL: z.url(),
  MEDIADOCK_URL: z.url(),
  MEDIADOCK_API_KEY: z.string(),
  MEDIADOCK_API_SECRET: z.string(),
});

export const env = envSchema.parse({
  // API_URL: process.env.EXPO_PUBLIC_API_URL,
  API_URL: "http://192.168.40.59:3001/api/v1",
  MEDIADOCK_URL: process.env.EXPO_PUBLIC_MEDIADOCK_URL,
  MEDIADOCK_API_KEY: process.env.EXPO_PUBLIC_MEDIADOCK_API_KEY,
  MEDIADOCK_API_SECRET: process.env.EXPO_PUBLIC_MEDIADOCK_API_SECRET,
});
