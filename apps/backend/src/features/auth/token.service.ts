import jwt, { SignOptions } from "jsonwebtoken";
import ENV from "../../shared/config/env";
import type { TokenPayload } from "../../shared/types/auth";
import { Response } from "express";
import { createError } from "../../shared/http/app-error";
import env from "../../shared/config/env";

export const TOKEN_ACCESS = "access_token";
export const TOKEN_REFRESH = "refresh_token";

/**
 * Generate access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRATION,
  } as SignOptions);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRATION,
  } as SignOptions);
};

/**
 * Generate email verification token
 */
export const generateVerificationToken = (userId: string): string => {
  return jwt.sign({ userId }, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_VERIFICATION_EXPIRATION,
  } as SignOptions);
};

/**
 * Generate password reset token
 */
export const generateResetToken = (
  userId: string,
  expiresIn?: string
): string => {
  return jwt.sign({ userId }, ENV.JWT_SECRET, {
    expiresIn: expiresIn || ENV.JWT_RESET_PASSWORD_EXPIRATION,
  } as SignOptions);
};

/**
 * Verify token
 */
export const verifyToken = <T>(token: string): T => {
  // try {
  return jwt.verify(token, ENV.JWT_SECRET) as T;
  // } catch (error) {
  //   console.log("Error while verifying token", error);
  //   throw createError.badRequest("Expired Session or Unauthorized");
  // }
};

/**
 * Function to parse expiration strings
 *
 * @param expiration string
 * @returns number
 */
const parseExpiration = (expiration: string): number => {
  const unit = expiration.slice(-1);
  const value = parseInt(expiration.slice(0, -1), 10);

  if (isNaN(value)) {
    throw createError.serverError(`Invalid token expiration value: --`);
  }

  switch (unit) {
    case "s": // seconds
      return value * 1000;

    case "m": // minutes
      return value * 60 * 1000;

    case "h": // hours
      return value * 60 * 60 * 1000;

    case "d": // days
      return value * 24 * 60 * 60 * 1000;

    default:
      throw createError.serverError(`Invalid token expiration unit: --`);
  }
};

export const setCookies = (
  accessToken: string,
  refreshToken: string,
  res: Response
) => {
  // Clear existing cookies
  res.clearCookie(TOKEN_ACCESS, {
    httpOnly: true,
    path: "/", // Ensure this matches the path used when setting the cookie
  });

  res.clearCookie(TOKEN_REFRESH, {
    httpOnly: true,
    path: "/", // Ensure this matches the path used when setting the cookie
  });

  const expiryAccessToken = new Date(
    Date.now() + parseExpiration(ENV.JWT_ACCESS_EXPIRATION)
  );
  const expiryRefreshToken = new Date(
    Date.now() + parseExpiration(ENV.JWT_REFRESH_EXPIRATION)
  );

  // Set new cookies
  res.cookie(TOKEN_ACCESS, accessToken, {
    domain: "localhost",
    httpOnly: true,
    path: "/",
    expires: expiryAccessToken,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  });

  res.cookie(TOKEN_REFRESH, refreshToken, {
    domain: "localhost",
    httpOnly: true,
    path: "/",
    expires: expiryRefreshToken,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  });
};

/**
 * Generate Auth Tokens
 *
 * @param token TokenPayload
 * @param res Response
 * @returns object
 */
export const issueAuthTokens = (token: TokenPayload, res: Response) => {
  try {
    const accessToken = generateAccessToken(token);
    const refreshToken = generateRefreshToken(token);

    // TODO: ---
    // const encryptedToken = encryptData(refreshToken);
    // await saveRefreshToken(refreshToken, encryptedToken);
    // setCookies(accessToken, encryptedToken, res);

    // TODO: ---
    setCookies(accessToken, refreshToken, res);

    return { accessToken, refreshToken };
  } catch (error) {
    console.log("Error while setting auth tokens");
    throw error;
  }
};
