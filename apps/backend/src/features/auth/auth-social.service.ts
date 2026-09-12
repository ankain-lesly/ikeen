import { Prisma, User } from "../../../prisma/generated/client";
import { generateFirstAndLastName } from "../../shared/lib/utils";
import {
  registerSocialSigninUser,
  USER_AUTH_SELECT_DATA,
} from "./auth.service";
import { createError } from "../../shared/http/app-error";
import prisma from "../../shared/config/db";
import { SocialSigninInput, SocialSigninValidateInput } from "./auth.validator";

/**
 * Link existing user account with social provider
 */
const linkSocialAccount = async (user: User, data: SocialSigninInput) => {
  // : Promise<User>
  // const { firstName, lastName } = generateFirstAndLastName(data.name);
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      auth: {
        update: {
          providerId: data.providerAccountId,
          provider: data.provider,
        },
      },
      isEmailVerified: true, // Ensure email is verified
    },
    select: {
      ...USER_AUTH_SELECT_DATA,
      auth: { select: { provider: true, providerId: true } },
    },
  });

  return updatedUser;
};

/**
 * Main social login function - login or register a user with a social provider
 */
export const socialSignin = async (data: SocialSigninInput) => {
  // : Promise<SocialAuthResult>
  // Create or return existing user
  const existingUser = await registerSocialSigninUser(
    {
      email: data.email.toLowerCase(),
      providerAccountId: data.providerAccountId,
      provider: data.provider,
      name: data.name,
      isEmailVerified: true, // Social providers already verified the email
      image: data.image,
      phone: data?.phone,
    },
    "return_if_exists",
  );

  let user = null;
  let isNewUser = false;
  let isLinked = false;

  if (!existingUser) {
    throw createError.serverError("Something Went Wrong");
    // Create new user
    // user = await createSocialUser(data);
    // isNewUser = true;
  } else if (!existingUser.auth?.providerId) {
    // Link existing account with social provider
    user = await linkSocialAccount(existingUser, data);
    isLinked = true;
  } else {
    // User already exists and is linked
    user = existingUser;
  }

  // Get agent data if applicable
  // const agent = await getAgentData(user);

  return {
    user,
    // agent,
    isNewUser,
    isLinked,
  };
};

/**
 * Validate social login and return user with agent data
 */
export const validateSocialSignin = async ({
  email,
  providerAccountId,
}: SocialSigninValidateInput) => {
  if (!email || !providerAccountId) {
    throw createError.badRequest("Provider account ID is required");
  }

  // Find user by email or provider account ID
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { auth: { providerId: providerAccountId } },
      ],
    },
    select: {
      ...USER_AUTH_SELECT_DATA,
      auth: { select: { provider: true, providerId: true } },
    },
  });

  if (!user) {
    throw createError.notFound("User not found");
  }

  return user;
};

/**
 * Unlink social account from user
 */
export const unlinkSocialAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { auth: true },
  });

  if (!user) {
    throw createError.notFound("User not found");
  }

  // Check if user has password (can't unlink if no other auth method)
  if (!user.auth?.password && user.auth?.provider !== "self") {
    throw createError.badRequest(
      "Cannot unlink social account. Please set a password first.",
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      auth: {
        update: {
          provider: "self",
          providerId: null,
        },
      },
    },
  });
};

/**
 * Check if user has linked social accounts
 */
export const getUserSocialAccounts = async (
  userId: string,
): Promise<{
  hasGoogle: boolean;
  hasFacebook: boolean;
  hasApple: boolean;
}> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { auth: true },
  });

  if (!user) {
    throw createError.notFound("User not found");
  }

  return {
    hasGoogle: user.auth?.provider === "google" && !!user.auth?.providerId,
    hasFacebook: user.auth?.provider === "facebook" && !!user.auth?.providerId,
    hasApple: user.auth?.provider === "apple" && !!user.auth?.providerId,
  };
};

/**
 * Update user profile from social data
 */
export const updateUserFromSocial = async (
  userId: string,
  data: Partial<SocialSigninInput>,
) => {
  const updateData: Prisma.UserUpdateInput = {};

  if (data.name) {
    const { firstName, lastName } = generateFirstAndLastName(data.name);
    updateData.firstName = firstName;
    updateData.lastName = lastName;
  }

  if (data.image) {
    updateData.avatarUrl = data.image;
  }

  if (data.email) {
    updateData.email = data.email.toLowerCase();
  }

  if (Object.keys(updateData).length === 0) {
    throw createError.badRequest("No valid data provided for update");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { ...USER_AUTH_SELECT_DATA, auth: true },
  });

  return updatedUser;
};
