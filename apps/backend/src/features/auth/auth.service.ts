import {
  VerificationType,
  User,
  Auth,
} from "@repo/db/generated/prisma/client";
import bcrypt from "bcrypt";
// import * as EmailService from "../../shared/emails/main";
import { createError } from "../../shared/http/app-error";
import {
  generateFirstAndLastName,
  generateUsername,
} from "../../shared/lib/utils";
import TokenService from "./verification/verification-token.service";
import { prisma } from "@repo/db";
import { Prisma } from "@repo/db/generated/prisma/client";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SocialSigninInput,
} from "./auth.validator";
import { VerificationService } from "./verification";

export const USER_AUTH_SELECT_DATA: Prisma.UserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  username: true,
  type: true,
  phone: true,
  avatarUrl: true,
  currency: true,
};

type RegisterMode = "return_if_exists" | "others";

export const registerUser = async (
  data: RegisterInput,
  mode?: RegisterMode,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    select: { ...USER_AUTH_SELECT_DATA, auth: true },
  });

  if (existingUser && mode === "return_if_exists") {
    return existingUser as User & { auth?: Auth };
  }

  if (existingUser) {
    throw createError.validationError(
      "User with this email already exists. If it's you, log in instead",
    );
  }

  const { firstName, lastName } = generateFirstAndLastName(data.name);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        firstName: firstName,
        lastName: lastName,
        username: await generateUsername(firstName, lastName, tx as typeof prisma),
        auth: {
          create: {
            type: "password",
            password: hashedPassword,
          },
        },
      },
      select: { ...USER_AUTH_SELECT_DATA, auth: { select: { provider: true } } },
    });

    return createdUser;
  });

  return user;
};

export const registerSocialSigninUser = async (
  data: SocialSigninInput,
  mode?: RegisterMode,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
    select: { ...USER_AUTH_SELECT_DATA, auth: true },
  });

  if (existingUser && mode === "return_if_exists") {
    return existingUser as User & { auth?: Auth };
  }

  if (existingUser) {
    throw createError.validationError("User with this email already exists");
  }

  const { firstName, lastName } = generateFirstAndLastName(data.name);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      firstName: firstName,
      lastName: lastName,
      phone: data?.phone,
      username: await generateUsername(firstName, lastName, prisma),
      // Social Auth
      isEmailVerified: data.isEmailVerified || false, // Social providers already verified the email
      avatarUrl: data.image,
      auth: {
        create: {
          type: "password",
        },
      },
    },
    select: {
      ...USER_AUTH_SELECT_DATA,
      auth: { select: { provider: true, providerId: true } },
    },
  });

  return user;
};

export const login = async (
  data: LoginInput,
  context?: { clientIp?: string },
) => {
  const where: Prisma.UserWhereInput = { email: data.email.toLowerCase() };
  const select: Prisma.UserSelect = { ...USER_AUTH_SELECT_DATA, auth: true };

  const userData = await prisma.user.findFirst({
    where,
    select,
  });

  if (!userData) {
    throw createError.validationError("Invalid login credentials");
  }

  const { auth, ...user } = userData;
  const password = auth?.password;
  const isPasswordValid = await bcrypt.compare(data.password, password!);

  if (!isPasswordValid) {
    throw createError.validationError("Invalid email or password");
  }

  return user;
};

export const forgotPassword = async (data: ForgotPasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    return; // Don't reveal that the user doesn't exist
  }

  // Check Request Type
  const result = await VerificationService.requestVerification({
    identifier: user.email,
    identifierType: "email",
    userId: user.id,
    type: VerificationType.password_reset,
  });

  return result;
};

export const resetPassword = async (data: ResetPasswordInput) => {
  // Validate token
  const userToken = await TokenService.findVerifiedToken(
    data.token,
    VerificationType.password_reset,
  );

  if (!userToken) {
    throw createError.validationError("Invalid or expired reset token");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  if (!userToken.userId) {
    throw createError.validationError("Invalid reset token");
  }
  const user = await prisma.user.update({
    where: { id: userToken.userId },
    data: {
      auth: {
        update: {
          password: hashedPassword,
        },
      },
    },
  });

  await TokenService.updateStatus(userToken.id, "verified");

  return user;
};

// TODO: -- Remove this function
export const getAuthUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...USER_AUTH_SELECT_DATA },
  });

  if (!user) {
    throw createError.notFound();
  }

  return user;
};

// TODO: -- Remove this function
export const getUserBasic = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, type: true, firstName: true },
  });

  if (!user) {
    throw createError.notFound();
  }

  return user;
};

export const updateLastLogin = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLogin: new Date() },
  });
};

/**
 * Select merchant context for staff member
 */