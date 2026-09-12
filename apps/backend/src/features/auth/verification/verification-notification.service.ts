import { resend } from "../../../shared/lib/resend";
import { twilio } from "../../../shared/lib/twilio";
import { VerificationType } from "../../../../prisma/generated/client";

export class VerificationNotificationService {
  /**
   * Main entry point to send verification code/link
   */
  static async sendVerification(
    identifier: string,
    type: VerificationType,
    value: string,
  ): Promise<void> {
    const isEmail = identifier.includes("@");

    if (isEmail) {
      await this.sendEmail(identifier, type, value);
    } else {
      await this.sendSms(identifier, type, value);
    }
  }

  /**
   * Send verification via Email
   */
  private static async sendEmail(
    to: string,
    type: VerificationType,
    value: string,
  ): Promise<void> {
    const { subject, html } = this.getEmailTemplate(type, value);
    await resend.sendEmail({ to, subject, html });
  }

  /**
   * Send verification via SMS
   */
  private static async sendSms(
    to: string,
    type: VerificationType,
    value: string,
  ): Promise<void> {
    const message = this.getSmsTemplate(type, value);
    await twilio.sendSms({ to, body: message });
  }

  /**
   * Templates for Email notifications
   */
  private static getEmailTemplate(type: VerificationType, value: string) {
    const isLink = value.startsWith("http");
    const actionLabel = isLink
      ? "Click here to verify"
      : `Your code is: <strong>${value}</strong>`;

    switch (type) {
      case "email_verification":
        return {
          subject: "Verify your email - iKeen",
          html: `<h1>Welcome to iKeen!</h1><p>Please verify your email address. ${actionLabel}</p>`,
        };
      case "password_reset":
        return {
          subject: "Reset your password - iKeen",
          html: `<h1>Password Reset Request</h1><p>You requested a password reset. ${actionLabel}</p>`,
        };
      case "two_factor_auth":
        return {
          subject: "Security Code - iKeen",
          html: `<h1>Two-Factor Authentication</h1><p>Your security code is: <strong>${value}</strong></p>`,
        };
      case "email_change":
        return {
          subject: "Confirm Email Change - iKeen",
          html: `<h1>Email Change Request</h1><p>Use this code to confirm your new email address. ${actionLabel}</p>`,
        };
      default:
        return {
          subject: "Verification Code - iKeen",
          html: `<p>Your iKeen verification code is: <strong>${value}</strong></p>`,
        };
    }
  }

  /**
   * Templates for SMS notifications
   */
  private static getSmsTemplate(type: VerificationType, value: string): string {
    switch (type) {
      case "email_verification":
      case "phone_verification":
        return `iKeen: Your verification code is ${value}.`;
      case "password_reset":
        return `iKeen: Your password reset code is ${value}.`;
      case "two_factor_auth":
        return `iKeen: Your security code is ${value}.`;
      default:
        return `iKeen: Your verification code is ${value}.`;
    }
  }
}
