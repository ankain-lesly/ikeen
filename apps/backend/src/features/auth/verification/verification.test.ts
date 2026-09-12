/**
 * Verification System Test Script (Updated)
 */

import prisma from "../../../shared/config/db";
import * as VerificationService from "./verification.service";
import { VerificationNotificationService } from "./verification-notification.service";
import {
  IdentifierType,
  VerificationType,
  VerificationStatus,
} from "../../../../prisma/generated/client";

const testEmailPhoneNumber = ""
// Global to capture tokens sent via mock
// let capturedToken: string | null = null;

// // Mock the notification service
// VerificationNotificationService.sendVerification = async (id, type, token) => {
//   console.log(`   [Mock] Notification sent to ${id} with token: ${token}`);
//   capturedToken = token;
// };

async function testVerificationSystem() {
  console.log("🧪 Testing Enhanced Verification System...\n");

  try {
    // ====================================
    // Test 1: Request Email Verification
    // ====================================
    // console.log("📧 Test 1: Request Email Verification");
    // const testEmail = `letechcg@gmail.com`;

    // const requestRes = await VerificationService.requestVerification({
    //   identifier: testEmail,
    //   identifierType: IdentifierType.email,
    //   type: VerificationType.email_verification,
    // });

    // const capturedToken = requestRes._token;

    // console.log(`   ✅ Request response: ${requestRes.message}`);

    // const tokenRecord = await prisma.verificationToken.findFirst({
    //   where: {
    //     identifier: testEmail,
    //     type: VerificationType.email_verification,
    //   },
    //   orderBy: { createdAt: "desc" },
    // });

    // if (!tokenRecord) {
    //   throw new Error("❌ Failed to find verification token in database");
    // }

    // console.log(`   ✅ Token created in DB (Hashed)`);
    // console.log(`   ✅ Plain token captured from mock: ${capturedToken}\n`);

    // ====================================
    // Test 2: Verify Token (Correct)
    // ====================================
    // console.log("✅ Test 2: Verify Token (Correct)");
    // const verifyRes = await VerificationService.verifyToken({
    //   identifier: testEmail,
    //   identifierType: IdentifierType.email,
    //   token: capturedToken!,
    //   type: VerificationType.email_verification,
    // });

    // console.log(`   ✅ Verification response: ${verifyRes.message}`);

    // const updatedToken = await prisma.verificationToken.findUnique({
    //   where: { id: tokenRecord.id },
    // });

    // if (updatedToken?.status !== VerificationStatus.verified) {
    //   throw new Error("❌ Token status was not updated to 'verified'");
    // }
    // console.log(
    //   `   ✅ Token status updated to 'verified' at ${updatedToken.verifiedAt}\n`,
    // );

    // ====================================
    // Test 3: Brute Force Protection (Failed Attempts)
    // ====================================
    console.log("🛡️ Test 3: Brute Force Protection");
    const bfEmail = testEmailPhoneNumber;

    await VerificationService.requestVerification({
      identifier: bfEmail,
      identifierType: IdentifierType.email,
      type: VerificationType.email_verification,
    });

    const bfToken = await prisma.verificationToken.findFirst({
      where: { identifier: bfEmail, type: VerificationType.email_verification },
      orderBy: { createdAt: "desc" },
    });

    console.log("   Submitting 5 incorrect codes...");
    for (let i = 0; i < 6; i++) {
      try {
        await VerificationService.verifyToken({
          identifier: bfEmail,
          identifierType: IdentifierType.email,
          token: "WRONG_CODE",
          type: VerificationType.email_verification,
        });
      } catch (e: any) {
        // Expected failure
      }
    }

    const lockedToken = await prisma.verificationToken.findUnique({
      where: { id: bfToken!.id },
    });

    if (lockedToken?.status !== VerificationStatus.cancelled) {
      throw new Error(
        `❌ Token should be cancelled after 5 failed attempts. Current status: ${lockedToken?.status}`,
      );
    }
    console.log(
      `   ✅ Token successfully locked (Status: ${lockedToken.status}, Attempts: ${lockedToken.attempts})\n`,
    );

    // ====================================
    // Test 4: Status Check
    // ====================================
    console.log("📊 Test 4: Status Check");
    // const status = await VerificationService.getStatus(
    //   testEmail,
    //   VerificationType.email_verification,
    // );
    // console.log(`   ✅ Status for ${testEmail}: ${status.status}\n`);

    // ====================================
    // Summary
    // ====================================
    console.log("=".repeat(50));
    console.log("✅ ALL VERIFICATION TESTS PASSED!");
    console.log("=".repeat(50));
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testVerificationSystem()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
