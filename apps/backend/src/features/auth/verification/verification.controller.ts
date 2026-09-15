import type { Request, Response } from "express";
import { catchErrorAsync } from "../../../shared/http/app-error";
import { sendSuccess } from "../../../shared/http/response";
import * as VerificationService from "./verification.service";
import {
  RequestVerificationSchema,
  VerifyTokenSchema,
  ResendVerificationSchema,
  VerificationStatusSchema,
} from "./verification.validator";
import { IdentifierType } from "@repo/db/generated/prisma/client";

/**
 * Handle request for a new verification token
 */
export const requestVerification = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = RequestVerificationSchema.parse(req);
    const result = await VerificationService.requestVerification({
      ...body,
      userId: req?.user?.id,
    });

    sendSuccess(res, result.message, result);
  },
);

/**
 * Handle token verification
 */
export const verifyToken = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = VerifyTokenSchema.parse(req);
    const result = await VerificationService.verifyToken(body);

    sendSuccess(res, result.message, result);
  },
);

/**
 * Handle resending verification token
 */
export const resendVerification = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = ResendVerificationSchema.parse(req);
    const result = await VerificationService.resendVerification(body);

    sendSuccess(res, result.message, result);
  },
);

/**
 * Handle checking verification status
 */
export const getVerificationStatus = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { params, headers } = VerificationStatusSchema.parse(req);

    // Identifier type can be passed in headers as per the requirement
    const identifierType = headers.identifiertype as IdentifierType | undefined;

    // We can also accept type as a query param if needed,
    // but the spec said /status/:id
    const result = await VerificationService.getStatus(params.id);

    sendSuccess(res, "Verification status retrieved", result);
  },
);
