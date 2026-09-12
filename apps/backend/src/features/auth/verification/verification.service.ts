import prisma from "../../../shared/config/db";
import {
  VerificationType,
  VerificationStatus,
  Prisma,
} from "../../../../prisma/generated/client";
import { VerificationTokenService } from "./verification-token.service";
import { VerificationNotificationService } from "./verification-notification.service";
import { createError } from "../../../shared/http/app-error";
import {
  RequestVerificationInput,
  VerifyTokenInput,
  ResendVerificationInput,
} from "./verification.validator";

/**
 * Request a new verification token
 */
export async function requestVerification(
  data: RequestVerificationInput & { userId?: string },
) {
  const { identifier, identifierType, type, method, userId } = data;

  // 2. Create new token (this automatically invalidates old ones)
  const { token, record } = await VerificationTokenService.createToken({
    identifier,
    identifierType,
    type,
    method,
    userId,
  });

  // 3. Send notification
  await VerificationNotificationService.sendVerification(
    identifier,
    type,
    token,
  );

  // 4. Update lastSentAt
  await VerificationTokenService.recordSent(record.id);

  return {
    message: "Verification token sent successfully",
    expiresAt: record.expiresAt,
  };
}

/**
 * Verify a token
 */
export async function verifyToken(data: VerifyTokenInput) {
  const { identifier, token, type } = data;

  // 1. Find valid token
  const validToken = await VerificationTokenService.findValidToken(
    identifier,
    type,
  );

  if (!validToken) {
    throw createError.validationError("Invalid or expired verification code");
  }

  // 2. Check hash
  const inputHash = VerificationTokenService.hashValue(token);
  if (validToken.tokenHash !== inputHash) {
    await VerificationTokenService.incrementAttempts(validToken.id);
    throw createError.validationError("Invalid verification code");
  }

  // 3. Mark token as verified
  await VerificationTokenService.updateStatus(
    validToken.id,
    VerificationStatus.verified,
  );

  return {
    message: "Verification successful",
    identifier,
  };
}

/**
 * Resend verification token
 */
export async function resendVerification(data: ResendVerificationInput) {
  const { identifier, type } = data;

  // 1. Find existing valid token
  const existingToken = await VerificationTokenService.findValidToken(
    identifier,
    type,
  );

  if (!existingToken) {
    // If no valid token, the request might be expired. User should request a new one.
    // Or we could automatically generate a new one. The user's commented code suggests requesting a new one.
    throw createError.validationError(
      "No active verification request found. Please request a new one.",
    );
  }

  // 2. Check cooldown (optional, but good practice. Let's assume 30 seconds for now)
  const lastSent = existingToken.lastSentAt?.getTime() || 0;
  const now = Date.now();
  if (now - lastSent < 30000) {
    throw createError.tooManyRequests(
      "Please wait a minute before requesting another code.",
    );
  }

  // Since we don't store the plain token, we can't "resend" the EXACT same code unless we generate a new one
  // OR we store the plain token (but we chose hashing for security).
  // Actually, if we use hashing, "resend" usually means "generate a new one" because the old one is gone from memory.
  // However, if the user wants "Resend", they might expect the same code if it hasn't expired.
  // Since we can't do that with hashing (unless we use reversible encryption, which we won't),
  // we will generate a NEW token but keep it for the same identifier/type.

  // Actually, let's just use requestVerification logic but maybe keep it under the same "Verification flow"
  // For simplicity and security, resend will just trigger a new token creation.

  return await requestVerification({
    identifier,
    identifierType: existingToken.identifierType,
    type: existingToken.type,
    userId: existingToken?.userId ?? undefined,
    method: existingToken.method,
  });
}

/**
 * Get current verification status
 */
export async function getStatus(identifier: string, type?: VerificationType) {
  const where: Prisma.VerificationTokenWhereInput = { identifier };
  if (type) where.type = type;

  const latest = await prisma.verificationToken.findFirst({
    where,
    orderBy: { createdAt: "desc" },
  });

  if (!latest) {
    throw createError.notFound(
      "No verification history found for this identifier",
    );
  }

  return {
    identifier: latest.identifier,
    type: latest.type,
    status: latest.status,
    createdAt: latest.createdAt,
    verifiedAt: latest.verifiedAt,
    expiresAt: latest.expiresAt,
  };
}
