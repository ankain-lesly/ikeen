import { prisma } from "@repo/db";
import type { UpdateProfileInput } from "./users.validator";
import { createError } from "../../shared/http/app-error";

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

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PROFILE_SELECT,
  });

  if (!user) {
    throw createError.notFound("User not found");
  }
  return user;
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

// export const registerUserPushToken = async (
//   userId: string,
//   data: PushTokenInput,
// ) => {
//   // return registerPushToken(userId, data);
// };
