import type { Request, Response } from "express";
import * as AuthService from "./auth.service";
import * as SocialAuthService from "./auth-social.service";
import { sendSuccess, sendCreated } from "../../shared/http/response";
import { catchErrorAsync, createError } from "../../shared/http/app-error";
import { issueAuthTokens, verifyToken } from "./token.service";
import {
  User, 
} from "@repo/db/generated/prisma/client";
import { TokenPayload } from "../../shared/types/auth";
import { auditLog } from "../../shared/lib/audit";
import { log } from "../../shared/lib";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  socialSiginValidateSchema,
  socialSigninSchema,
} from "./auth.validator";

export const register = catchErrorAsync(async (req: Request, res: Response) => {
  const { body } = registerSchema.parse(req);

  const user = await AuthService.registerUser(body);

  const userData = await setupAuthTokens(res, user);

  // Audit log registration
  await auditLog({
    action: "USER_REGISTER",
    details: "You successfully registered a new account.",
    severity: "INFO",
    resourceType: "USER",
    isSystem: true,
    resourceId: user.id,
    metadata: {
      email: user.email,
    },
    req,
  });

  sendCreated(res, "User registered successfully", userData);
});

export const login = catchErrorAsync(async (req: Request, res: Response) => {
  const { body } = loginSchema.parse(req);

  const user = await AuthService.login(body, {});

  const userData = await setupAuthTokens(res, user);

  // Audit log successful login
  await auditLog({
    action: "USER_LOGIN",
    details: "You logged into your account.",
    severity: "INFO",
    isSystem: true,
    metadata: {
      loginMode: req.query?.type || "normal",
      userType: user.type,
    },
    req,
  });

  sendCreated(res, "Login successfully", userData);
});

export const socialAuthSignin = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = socialSigninSchema.parse(req);

    const result = await SocialAuthService.socialSignin(body);

    const userData = await setupAuthTokens(res, result.user);

    await auditLog({
      action: "SOCIAL_LOGIN",
      details: `You logged into your account using social authentication [${result.user.auth?.provider || "Default"}].`,
      severity: "INFO",
      isSystem: true,
      metadata: {
        loginMode: req.query?.type || "normal",
        userType: result.user.type,
        email: result.user.email,
      },
      req,
    });

    sendCreated(res, "Account created successfully", {
      ...result,
      ...userData,
    });
  },
);

export const socialAuthValidate = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = socialSiginValidateSchema.parse(req);

    const user = await SocialAuthService.validateSocialSignin(body);

    const userData = await setupAuthTokens(res, user);

    // Audit log social auth validation
    await auditLog({
      action: "SOCIAL_AUTH_VALIDATE",
      details: "Your social authentication was successfully validated.",
      severity: "INFO",
      isSystem: true,
      metadata: {
        loginMode: req.query?.type || "normal",
        userType: user.type,
      },
      req,
    });

    sendCreated(res, "Social Login successfully", userData);
  },
);

// ==========================================
// Handle Password Reset (protection removed)
// ==========================================
export const forgotPassword = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = forgotPasswordSchema.parse(req);

    const results = await AuthService.forgotPassword(body);

    // Audit log forgot password request
    await auditLog({
      action: "FORGOT_PASSWORD_REQUEST",
      details: "You requested a password reset for your account.",
      severity: !results ? "CRITICAL" : "INFO",
      isSystem: true,
      metadata: {
        email: body.email,
      },
      req,
    });

    sendSuccess(
      res,
      "If your email exists in our system, you will receive a password reset link.",
    );
  },
);

export const resetPassword = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = resetPasswordSchema.parse(req);
    const user = await AuthService.resetPassword(body);

    // Audit log reset password
    await auditLog({
      action: "RESET_PASSWORD",
      details: "You successfully reset your password.",
      severity: "WARN",
      isSystem: true,
      req,
    });

    sendSuccess(
      res,
      "Password reset successfully. You can now log in with your new password.",
      { type: user.type },
    );
  },
);

export const getMe = catchErrorAsync(async (req: Request, res: Response) => {
  const user = await AuthService.getAuthUser(req.user.id);
  sendSuccess(res, "User profile retrieved successfully", user);
});

export const refreshToken = catchErrorAsync(
  async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken || req.cookies.refresh_token;

    if (!refreshToken) {
      throw createError.unauthorized("Refresh token required");
    }

    // Verify refresh token
    const payload = verifyToken<TokenPayload>(refreshToken);

    // Get user from database
    const user = await AuthService.getUserBasic(payload.user.id);

    // Generate new tokens
    const userData = await setupAuthTokens(res, user);
    sendSuccess(res, "Token refreshed successfully", userData.tokens);
  },
);

/**
 * Setup auth tokens
 * @param user
 * @returns
 */

type AuthTokenUser = Pick<User, "id" | "type">;

const setupAuthTokens = async (
  res: Response,
  userUser: AuthTokenUser,
) => {
  const user: AuthTokenUser = userUser;
  const tokenPayload: {
    user: TokenPayload["user"];
  } = {
    user: {
      id: user.id,
      type: user.type,
    },
  };

  const tokens = issueAuthTokens(tokenPayload as TokenPayload, res);

  // Update last login
  AuthService.updateLastLogin(user.id);

  log({
    message: "Setup auth tokens",
    user: {
      ...user,
    },
    tokens,
  });

  return {
    user: {
      ...user,
    },
    tokens,
  };
};