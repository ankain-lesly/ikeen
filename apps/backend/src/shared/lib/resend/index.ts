import { Resend } from "resend";
import env from "../../config/env";
import { log } from "../utils";
import { emailLayout } from "../../templates/emails/baseLayout";
import { isCompleteHtmlDocument } from "../../config";

export const resendClient = new Resend(env.RESEND_API_KEY);

export const resend = {
  /**
   * Send an email with error handling and logging
   */
  async sendEmail(payload: {
    // from?: string;
    to: string;
    subject: string;
    html: string;
  }) {
    try {
      log("✅ SENDING EMAIL (RESEND)");
      const { to, subject, html: _html } = payload;

      let html = _html;

      if (!isCompleteHtmlDocument(_html)) {
        html = emailLayout(subject, _html);
      }

      const { data, error } = await resendClient.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      log({ ResendResponse: data });

      if (error) {
        log({ TwilioError: { ...error } });
        throw new Error(error.message);
      }

      return data;
    } catch (error: any) {
      log({ TwilioError: { ...error } });
      log(`Resend failed to send email: ${error.message}`);
    }
  },
};

export default resend;
