import { Router } from "express";
import * as Controller from "./verification.controller";
import {
  RequestVerificationSchema,
  VerifyTokenSchema,
  ResendVerificationSchema,
  VerificationStatusSchema,
} from "./verification.validator";
import { validate } from "../../../shared/middlewares/validation";

const router = Router();

/**
 * @route   POST /api/verification/request
 * @desc    Request a new verification token (Email/SMS)
 * @access  Public
 */
router.post(
  "/request",
  validate(RequestVerificationSchema),
  Controller.requestVerification,
);

/**
 * @route   POST /api/verification/verify
 * @desc    Verify a token/code
 * @access  Public
 */
router.post("/verify", validate(VerifyTokenSchema), Controller.verifyToken);

/**
 * @route   POST /api/verification/resend
 * @desc    Resend the latest active verification token
 * @access  Public
 */
router.post(
  "/resend",
  validate(ResendVerificationSchema),
  Controller.resendVerification,
);

/**
 * @route   GET /api/verification/status/:id
 * @desc    Check verification status for an identifier
 * @access  Public
 */
router.get(
  "/status/:id",
  validate(VerificationStatusSchema),
  Controller.getVerificationStatus,
);

export default router;
