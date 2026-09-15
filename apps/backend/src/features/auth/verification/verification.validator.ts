import { z } from "zod";
import {
  VerificationType,
  VerificationMethod,
  IdentifierType,
} from "@repo/db/generated/prisma/client";

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

/**
 * Validates verification request data
 */
export const RequestVerificationSchema = z
  .object({
    body: z.object({
      identifier: z.string().trim().min(1, "Identifier is required"),
      identifierType: z.enum(IdentifierType, {
        message: "Invalid identifier type. Must be 'email' or 'phone'",
      }),
      type: z.enum(VerificationType, {
        message: "Invalid verification type",
      }),
      method: z
        .enum(VerificationMethod)
        .default(VerificationMethod.code)
        .optional(),
    }),
  })
  .superRefine((data, ctx) => {
    const { identifier, identifierType } = data.body;
    if (identifierType === IdentifierType.email && !identifier.includes("@")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid email format",
        path: ["body", "identifier"],
      });
    }
    if (
      identifierType === IdentifierType.phone &&
      !phoneRegex.test(identifier)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Invalid phone number format. Use international format (e.g., +237...)",
        path: ["body", "identifier"],
      });
    }
  });

/**
 * Validates token verification data
 */
export const VerifyTokenSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, "Identifier is required"),
    identifierType: z.enum(IdentifierType),
    token: z.string().trim().min(1, "Verification token is required"),
    type: z.enum(VerificationType),
  }),
});

/**
 * Validates resend request data
 */
export const ResendVerificationSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, "Identifier is required"),
    identifierType: z.enum(IdentifierType),
    type: z.enum(VerificationType),
  }),
});

/**
 * Validates status request data
 */
export const VerificationStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, "Identifier is required"),
  }),
  headers: z
    .object({
      identifiertype: z.enum(IdentifierType).optional(), // Express headers are lowercase
    })
    .passthrough(),
});

// Exported types
export type RequestVerificationInput = z.infer<
  typeof RequestVerificationSchema
>["body"];
export type VerifyTokenInput = z.infer<typeof VerifyTokenSchema>["body"];
export type ResendVerificationInput = z.infer<
  typeof ResendVerificationSchema
>["body"];
