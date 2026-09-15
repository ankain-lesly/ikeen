import type { Request, Response } from "express";
import { catchErrorAsync, createError } from "../../shared/http/app-error";
import { sendSuccess } from "../../shared/http/response";
import * as Service from "./users.service";
import { pushTokenSchema, updateProfileSchema } from "./users.validator";

// Profile, profile updates and push tokens always belong to the authenticated
// user account, so use req.user.id directly. (userContextResolved resolves to
// the merchant id for merchant sessions, which is the wallet owner, not the user.)
export const getMe = catchErrorAsync(async (req: Request, res: Response) => {
  const profile = await Service.getUserProfile(req.user.id);
  sendSuccess(res, "Profile retrieved successfully", profile);
});

export const patchMe = catchErrorAsync(async (req: Request, res: Response) => {
  const { body } = updateProfileSchema.parse(req);
  const profile = await Service.updateProfile(req.user.id, body);
  sendSuccess(res, "Profile updated successfully", profile);
});

export const registerPushToken = catchErrorAsync(
  async (req: Request, res: Response) => {
    const { body } = pushTokenSchema.parse(req);
    throw createError.serverError("Not implemented");
    // const token = await Service.registerUserPushToken(req.user.id, body);
    // sendSuccess(res, "Push token registered successfully", token);
  },
);
