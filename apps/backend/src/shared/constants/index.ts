// import { UserType } from "../../../prisma/generated/client";

// export const HTTP = {
//   VALIDATION_ERROR: 400,
//   UNAUTHORIZED: 401,
//   FORBIDDEN: 403,
//   NOT_FOUND: 404,
//   SERVER_ERROR: 500,
// } as const;

// export const DEFAULT_ROLE: UserType = "customer";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// // ======================
// // PAYMENTS CONFIGURATION
// // ======================

// // Set commission percentage (could be dynamic based on merchant agreement)
// export const PLATFORM_ORDER_COMMISSION_PERCENTAGE = 10; // 5% commission
// export const PLATFORM_ORDER_COMMISSION_ENABLED = true;

// // Platform transaction charges
// export const PLATFORM_DELIVERY_COMMISSION_PERCENTAGE = 10;
// export const PLATFORM_DELIVERY_COMMISSION_ENABLED = true;
// export const PLATFORM_PAYMENT_CHARGES_FEE = 20;

// export const DELIVERY_FEE_PERCENTAGE = {
//   STANDARD: 0,
//   EXPRESS: 10,
//   SCHEDULED: 0,
// } as const;


// export type PAYMENT_GATEWAY = "FAPSHI" | "CAMPAY" | "MOCK";

// /** @deprecated Use toGatewayOperator() from shared/lib/payments */
// export const PAYMENT_PROVIDER_MEDIUM: Record<PAYMENT_GATEWAY, Record<string, string>> = {
//   FAPSHI: {
//     mobile_money: "mobile money",
//     orange_money: "Orange money",
//     mtn_mobile_money: "mobile money",
//   },
//   CAMPAY: {
//     mobile_money: "MTN",
//     orange_money: "ORANGE",
//     mtn_mobile_money: "MTN",
//   },
//   MOCK: {
//     mobile_money: "mobile_money",
//     orange_money: "orange_money",
//     mtn_mobile_money: "mobile_money",
//   },
// };

// ======================
// EMAIL SERVICE
// ======================
export type EmailServiceType = "resend" | "nodemailer";

export const EMAIL_SERVICE_PROVIDE: EmailServiceType = "resend";
