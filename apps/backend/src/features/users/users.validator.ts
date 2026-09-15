import { z } from "zod";
import { NotifyPlatformType } from "@repo/db/generated/prisma/enums";

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

export const pushTokenSchema = z.object({
  body: z.object({
    token: z.string().min(1, "Push token is required"),
    platform: z.nativeEnum(NotifyPlatformType),
    deviceName: z.string().optional(),
    deviceId: z.string().optional(),
    osVersion: z.string().optional(),
    appVersion: z.string().optional(),
    manufacturer: z.string().optional(),
    model: z.string().optional(),
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>["body"];
export type PushTokenInput = z.infer<typeof pushTokenSchema>["body"];
