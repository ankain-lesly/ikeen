import { Router } from "express";
import * as AuthController from "./auth.controller";
import { validate } from "../../shared/middlewares/validation";

import * as AuthValidator from "./auth.validator";
import { AUTH } from "../../shared/middlewares/auth";

const router = Router();

/**
 * TODO: --- features
 * - Last login
 * - track activity
 * - track location
 * - track device
 * - track browser
 * - track OS
 *
 */

// =====================================
// Public AUTH routes - No authentication required
// =====================================
router.post(
  "/register",
  validate(AuthValidator.registerSchema),
  AuthController.register,
);
router.post(
  "/login",
  validate(AuthValidator.loginSchema),
  AuthController.login,
);

// >> Public routes - No authentication required
// router.post(
//   "/verify-email",
//   validate(verifyEmailSchema),
//   AuthController.verifyEmail
// );

// router.post(
//   "/resend-verification",
//   validate(forgotPasswordSchema),
//   AuthController.resendVerificationEmail
// );

// =====================================
// Reset Password - Public routes
// =====================================

router.post(
  "/forgot-password",
  validate(AuthValidator.forgotPasswordSchema),
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  validate(AuthValidator.resetPasswordSchema),
  AuthController.resetPassword,
);

router.post("/me", AUTH.basic, AuthController.getMe);

// =====================================
// Refresh token - Public route (validates refresh token internally)
// =====================================
router.post("/refresh-token", AuthController.refreshToken);
// router.post("/verify-token", AuthController.verifyClientToken);

// =====================================
// Social Login - Public routes
// =====================================
router.post(
  "/social-signin",
  validate(AuthValidator.socialSigninSchema),
  AuthController.socialAuthSignin,
);
// Validate and send user details - Public routes
router.post(
  "/social-signin/validate",
  validate(AuthValidator.socialSiginValidateSchema),
  AuthController.socialAuthValidate,
);

export default router;
