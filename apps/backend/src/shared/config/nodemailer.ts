import nodemailer, { Transporter } from "nodemailer";

import ENV from "./env";
import { EMAIL_SERVICE_PROVIDE } from "../constants";
import resend from "../lib/resend";
import { log } from "../lib";
import { logger } from "../lib/logger";
import { emailLayout } from "../templates/emails/baseLayout";

export const transporter: Transporter = nodemailer.createTransport({
  host: ENV.EMAIL_SMTP_HOST,
  port: ENV.EMAIL_SMTP_PORT,
  secure: ENV.EMAIL_SMTP_PORT === 465,
  service: "gmail",
  auth: {
    user: ENV.EMAIL_SMTP_USERNAME,
    pass: ENV.EMAIL_SMTP_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  // from?: string;
}

export const isCompleteHtmlDocument = (html: string): boolean => {
  // Check for essential HTML document structure
  const hasDoctype = html.trim().startsWith("<!DOCTYPE html>");
  const hasHtmlTag = /<html[^>]*>/i.test(html);
  const hasHeadAndBody = /<head[^>]*>.*<\/head>.*<body[^>]*>.*<\/body>/is.test(
    html,
  );

  return hasDoctype && hasHtmlTag && hasHeadAndBody;
};

export const sendEmail = async (options: EmailOptions) => {
  if (!transporter) return log("Email service is not configured", 500);

  let html = options.html;

  if (!isCompleteHtmlDocument(options.html)) {
    html = emailLayout(options.subject, options.html);
  }
  const mailOptions = {
    from: ENV.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: html,
  };

  if (EMAIL_SERVICE_PROVIDE === "resend")
    resend
      .sendEmail(mailOptions)
      .catch((e) => logger.error(`🍟Error sending email: ${e?.message}`, e));
  else
    transporter
      .sendMail(mailOptions)
      .catch((e) => log(`🍟Error sending email: ${e?.message}`, e));
};
