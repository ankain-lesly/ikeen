import { Request } from "express";
import { UserType } from "../../../prisma/generated/client";
import prisma from "../config/db";

export interface AuditLogUserParams {
  // Override user context (optional)
  userId?: string;
  userType?: UserType;
  merchantId?: string;
}
export interface AuditLogParams {
  // Action details
  action: string;
  severity?: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  resourceType?: string;
  resourceId?: string;

  // Change tracking
  metadata?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;

  // Status
  isSystem?: boolean;
  success?: boolean;
  errorMessage?: string;

  // Request context
  req: Request;

  // Detail: A precise descriptive message.
  details: string;
}

/**
 * Universal audit logging - works for ALL user types
 */
export async function auditLog(params: AuditLogParams): Promise<void> {
  try {
    // Extract request context
    let ipAddress =
      params.req?.headers?.["x-forwarded-for"] ||
      params.req?.headers?.["x-real-ip"] ||
      params.req?.ip ||
      "unknown";

    let userAgent = params.req?.headers?.["user-agent"] || "unknown";
    let requestPath = params.req?.path || params.req?.url;
    let requestMethod = params.req?.method;

    // Use resolved user context or provided overrides
    const context = getUserContext(params.req);
    if (context.merchantId) context.userId = undefined;

    await prisma.auditLog.create({
      data: {
        userId: context.userId,
        // userType: context.userType,
        merchantId: context.merchantId,
        action: params.action,
        severity: params.severity || "INFO",
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details,
        metadata: {
          ...params.metadata,
          // isImpersonated: context.isImpersonated,
        },
        changes: params.changes,
        success: params.success ?? true,
        errorMessage: params.errorMessage,
        ipAddress: ipAddress.toString(),
        userAgent,
        requestPath,
        isSystem: params.isSystem,
        requestMethod,
      },
    });
  } catch (error) {
    console.error("[Audit Log Error]", error);
  }
}

export interface UserContext {
  // Universal user identification
  userId?: string;
  // userType?: UserType;

  // Context IDs
  merchantId?: string;
}
/**
 * Helper to extract user context from request
 */
export function getUserContext(
  req: Request,
  // type: boolean = true,
): UserContext {
  if (req.merchant) {
    return { merchantId: req?.merchant?.id };
  } else if (req.user) {
    return { userId: req?.user?.id };
  } else {
    return {};
  }

  // return {
  //   userId: req?.user?.id,
  //   merchantId: req?.merchant?.id,
  // };
}

/**
 * Helper to extract user context from request
 */

export type UserTRef = "userId" | "merchantId";
export type UserRelation = Partial<Record<UserTRef, string>>;

export interface ResolvedUser {
  userId: string;
  userType: UserType;
  // isImpersonated: boolean;

  // rel returns a mapping of user type reference to user ID, e.g. { userId: "123" }
  // rel: UserRelation;
}

type ContextParams = { merchantId?: string | null };

/**
 * Resolves the user type based on the provided context parameters
 * @param params
 * @returns
 */
export function userTypeResolved(
  params: ContextParams,
): { userId: string; userType: UserType } | null {
  if (params.merchantId)
    return {
      userId: params.merchantId,
      userType: "merchant",
    };

  // return null
  // if(throwError)
  //   throw createError.badRequest("Invalid context reference");
  // else
  return null;
}

// TODO: Verify and Validate Context
export function userContextResolved(req: Request): ResolvedUser {
  const userId = req.merchant?.id || req.user?.id;

  let userType: UserType = req.user?.type;

  return {
    userId,
    userType,
  };
}

/**
 * Log successful action
 */
export async function logSuccess(params: Omit<AuditLogParams, "success">) {
  await auditLog({ ...params, success: true });
}

/**
 * Log failed action
 */
export async function logFailure(
  params: Omit<AuditLogParams, "success" | "severity">,
  error: Error,
) {
  await auditLog({
    ...params,
    success: false,
    severity: "ERROR",
    errorMessage: error.message,
  });
}

/**
 * Track field changes
 */
export function trackChanges<T extends Record<string, any>>(
  oldData: Partial<T>,
  newData: Partial<T>,
  fields: (keyof T)[],
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {};

  fields.forEach((field) => {
    if (oldData[field] !== newData[field]) {
      changes[field as string] = {
        old: oldData[field],
        new: newData[field],
      };
    }
  });

  return changes;
}

/**
 * simple helper to check if user is a moderator (admin/support)
 * @param param
 * @returns
 */
export const checkModerator = (param: UserType | Request) => {
  const role = typeof param === "object" ? param?.user?.type : param; 
  
  const moderators: UserType[] = [
    // Admin
    "admin",

  ];

  return moderators.includes(role);
};
