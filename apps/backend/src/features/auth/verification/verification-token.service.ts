import crypto from "crypto";
import { prisma } from "@repo/db";
import {
  VerificationToken,
  VerificationType,
  VerificationMethod,
  VerificationStatus,
  IdentifierType,
} from "@repo/db/generated/prisma/client";
import { log } from "../../../shared/lib";

export interface CreateTokenData {
  identifier: string;
  identifierType: IdentifierType;
  type: VerificationType;
  method?: VerificationMethod;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  expiresInMinutes?: number;
}

export class VerificationTokenService {
  // ============================================================================
  // TOKEN HELPERS (ENCAPSULATED)
  // ============================================================================

  /**
   * Generate a numeric OTP code
   */
  static generateOTP(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return crypto.randomInt(min, max).toString();
  }

  /**
   * Generate a secure random token string
   */
  static generateSecret(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Hash a value using SHA-256
   */
  static hashValue(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Create a new verification token or rotate an existing one
   */
  static async createToken(
    data: CreateTokenData,
  ): Promise<{ token: string; record: VerificationToken }> {
    const {
      identifier,
      identifierType,
      type,
      method = "code",
      userId,
      ipAddress,
      userAgent,
      device,
      expiresInMinutes = 15,
    } = data;

    // 1. Generate the plain token based on method
    const plainToken =
      method === VerificationMethod.otp || method === VerificationMethod.code
        ? this.generateOTP()
        : this.generateSecret();

    const tokenHash = this.hashValue(plainToken);
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);

    // 2. Invalidate previous tokens of same type for this identifier
    await this.invalidateTokens(identifier, type);

    // 3. Create new record
    const record = await prisma.verificationToken.create({
      data: {
        identifier,
        identifierType,
        type,
        method,
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
        device,
        status: VerificationStatus.pending,
      },
    });

    log("[CREATE TOKEN]: ", { token: plainToken, record });

    return { token: plainToken, record };
  }

  /**
   * Find a valid, pending token by identifier and type
   */
  static async findValidToken(
    identifier: string,
    type: VerificationType,
  ): Promise<VerificationToken | null> {
    return await prisma.verificationToken.findFirst({
      where: {
        identifier,
        type,
        status: VerificationStatus.pending,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // TODO: Newly added token
  /**
   * Find a verified, pending token by identifier and type
   */
  static async findVerifiedToken(
    identifier: string,
    type: VerificationType,
  ): Promise<VerificationToken | null> {
    return await prisma.verificationToken.findFirst({
      where: {
        identifier,
        type,
        status: VerificationStatus.verified,
        // expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Increment failed attempts and check for lockout
   */
  static async incrementAttempts(tokenId: string): Promise<VerificationToken> {
    const token = await prisma.verificationToken.update({
      where: { id: tokenId },
      data: { attempts: { increment: 1 } },
    });

    // If attempts exceed limit, cancel the token
    if (token.attempts >= 5) {
      return await this.updateStatus(tokenId, VerificationStatus.cancelled);
    }

    return token;
  }

  /**
   * Update token status and record relevant timestamps
   */
  static async updateStatus(
    tokenId: string,
    status: VerificationStatus,
  ): Promise<VerificationToken> {
    const data: any = { status };

    if (status === VerificationStatus.verified) {
      data.verifiedAt = new Date();
    } else if (status === VerificationStatus.cancelled) {
      data.cancelledAt = new Date();
    }

    return await prisma.verificationToken.update({
      where: { id: tokenId },
      data,
    });
  }

  /**
   * Mark all active tokens of a specific type as cancelled
   */
  static async invalidateTokens(
    identifier: string,
    type: VerificationType,
  ): Promise<void> {
    await prisma.verificationToken.updateMany({
      where: {
        identifier,
        type,
        status: VerificationStatus.pending,
      },
      data: {
        status: VerificationStatus.cancelled,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Record that a notification was sent
   */
  static async recordSent(tokenId: string): Promise<void> {
    await prisma.verificationToken.update({
      where: { id: tokenId },
      data: { lastSentAt: new Date() },
    });
  }

  /**
   * Cleanup expired tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.verificationToken.updateMany({
      where: {
        status: VerificationStatus.pending,
        expiresAt: { lt: new Date() },
      },
      data: {
        status: VerificationStatus.expired,
      },
    });
    return result.count;
  }
}

export default VerificationTokenService;
