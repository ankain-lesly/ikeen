import { z } from "zod";

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export const e164PhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((value) => value.replace(/\s/g, ""))
  .refine(
    (value) => E164_REGEX.test(value),
    "Invalid phone number. Use international format (e.g., +237...)",
  );

export type E164Phone = z.infer<typeof e164PhoneSchema>;
