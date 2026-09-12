import prisma from "../../shared/config/db";
import { createError } from "../../shared/http/app-error";
import { registerPushToken } from "../notifications/notification.service";
import type { PushTokenInput, UpdateProfileInput } from "./users.validator";

const USER_PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  phone: true,
  type: true,
  avatarUrl: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const getProfileWithWallet = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PROFILE_SELECT,
  });

  if (!user) {
    throw createError.notFound("User not found");
  }

  // Merchant wallets are owned by the merchant entity, not the user.
  let ownerId = userId;
  if (user.type === "merchant") {
    const merchant = await prisma.merchant.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (merchant) {
      ownerId = merchant.id;
    }
  }

  const wallet = await prisma.wallet.findUnique({
    where: {
      ownerId_ownerType: {
        ownerId,
        ownerType: user.type,
      },
    },
    select: {
      id: true,
      balance: true,
      currency: true,
    },
  });

  return {
    ...user,
    wallet: wallet
      ? {
          id: wallet.id,
          balance: wallet.balance.toString(),
          currency: wallet.currency,
        }
      : null,
  };
};

export const updateProfile = async (userId: string, data: UpdateProfileInput) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
    },
    select: USER_PROFILE_SELECT,
  });

  return user;
};

export const registerUserPushToken = async (
  userId: string,
  data: PushTokenInput,
) => {
  return registerPushToken(userId, data);
};
