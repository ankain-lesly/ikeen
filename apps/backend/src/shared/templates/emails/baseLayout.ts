// src/notifications/email/baseLayout.ts
// Reusable HTML wrapper for all transactional emails

import env from "../../config/env";

interface LayoutOptions {
  preheader?: string;
  footerNote?: string;
}

export function emailLayout(
  title: string,
  bodyHtml: string,
  opts: LayoutOptions = {},
): string {
  const preheader = opts.preheader ?? title;
  const footerNote =
    opts.footerNote ??
    `You received this email because you are registered on ${env.APP_NAME}.`;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111928; }
    .wrapper { max-width: 600px; margin: 32px auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .header { background: #1A56DB; padding: 32px 40px; text-align: center; }
    .header h1 { color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header .subtitle { color: #BFDBFE; font-size: 13px; margin-top: 4px; }
    .body { padding: 36px 40px; }
    .body p { font-size: 15px; line-height: 1.65; color: #374151; margin-bottom: 16px; }
    .body h2 { font-size: 18px; font-weight: 700; color: #111928; margin-bottom: 12px; }
    .info-box { background: #EBF5FF; border-left: 4px solid #1A56DB; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
    .info-box p { margin: 0; font-size: 14px; color: #1E40AF; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
    .info-row:last-child { border-bottom: none; }
    .info-row .label { color: #6B7280; font-weight: 500; }
    .info-row .value { color: #111928; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background: #1A56DB; color: #FFFFFF !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 24px 0; }
    .btn-success { background: #0E9F6E; }
    .btn-danger { background: #E02424; }
    .btn-warning { background: #FF5A1F; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-green { background: #DEF7EC; color: #03543F; }
    .badge-red { background: #FDE8E8; color: #9B1C1C; }
    .badge-yellow { background: #FDF6B2; color: #723B13; }
    .items-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .items-table th { background: #F9FAFB; padding: 10px 12px; text-align: left; color: #6B7280; font-weight: 600; border-bottom: 2px solid #E5E7EB; }
    .items-table td { padding: 10px 12px; border-bottom: 1px solid #F3F4F6; color: #111928; }
    .items-table .total-row td { font-weight: 700; background: #F9FAFB; }
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 24px 0; }
    .footer { background: #F9FAFB; padding: 24px 40px; text-align: center; border-top: 1px solid #E5E7EB; }
    .footer p { font-size: 12px; color: #9CA3AF; line-height: 1.6; }
    .footer a { color: #1A56DB; text-decoration: none; }
    @media (max-width: 600px) {
      .body { padding: 24px 20px; }
      .header { padding: 24px 20px; }
    }
  </style>
</head>
<body>
  <!-- preheader hidden text -->
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <div class="wrapper">
    <div class="header">
      <h1>${env.APP_NAME}</h1>
      <div class="subtitle">Food Delivery & Multi-Market Platform</div>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p>${footerNote}</p>
      <p style="margin-top:8px;">
        <a href="${env.APP_URL}/privacy">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="${env.APP_URL}/support">Contact Support</a>
      </p>
      <p style="margin-top:12px;">© ${year} ${env.APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

// Helper to build an info-row table section
export function infoRows(rows: Array<[string, string]>): string {
  return rows
    .map(
      ([label, value]) =>
        `<div class="info-row"><span class="label">${label}: </span> &nbsp;&nbsp; <span class="value">${value}</span></div>`,
    )
    .join("");
}
 