import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { createError, CUSTOM_ERROR_NAME } from "../http/app-error";
import { log } from "../lib/utils";
import { IS_DEV, IS_PROD } from "../config/env";
import { logger } from "../lib";
import { PrismaClientKnownRequestError } from "@repo/db/generated/prisma/internal/prismaNamespace";

function formatZodError(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  success?: false;
  code?: number | string;
  keyValue?: Record<string, any>;
  errors?: Record<string, { message: string }>;
  path?: string;
  value?: any;
  data?: any;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 * Must have 4 parameters for Express to recognize it as an error handler
 */
export default function globalErrorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (res.headersSent) {
    log("💔 Global Error Handler — headers already sent, skipping response");
    log("💔 Error:", err?.message);
    return;
  }

  // Set default status code and status
  err.statusCode = err.statusCode || 500;
  err.code = err.code || "none";

  // Log error for debugging
  log("💔 Global Error Handler");
  log("💔 Error:", {
    ...err,
    message: err.message,
    name: err.name,
    code: err.code,
    statusCode: err.statusCode,
    data: err.data,
  });
  log("💔 Stack:", !IS_PROD ? err.stack : undefined);

  // Handle Prisma database errors
  if (err instanceof PrismaClientKnownRequestError) {
    // Handle Prisma unique constraint violation error (P2002)
    if (err.code === "P2002") {
      const field = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(", ")
        : "Unknown field"; // Fields that caused violation

      const message = `Duplicate: This field ${field} already exists`;
      err = createError.conflict(message);
    }
    // Handle Prisma foreign key violation error (P2003)
    else if (err.code === "P2003") {
      const message = `Foreign key violation: ${err.message}`;
      err = createError.badRequest(message);
    }
    // Handle Prisma not-null constraint violation error (P2004)
    else if (err.code === "P2004") {
      const message = `Null value violation: ${err.message}`;
      err = createError.badRequest(message);
    }
    // Handle Prisma out of range error (P2005)
    else if (err.code === "P2005") {
      const message = `Out of range: ${err.message}`;
      err = createError.badRequest(message);
    }
    // Handle PostgreSQL invalid input data error (22P02) - typically occurs in raw queries
    else if (err.code === "22P02") {
      const message = `Invalid input data: ${err.message}`;
      err = createError.badRequest(message);
    }
    // Handle PostgreSQL check constraint violation error (23514) - typically occurs in raw queries
    else if (err.code === "23514") {
      const message = `Check constraint violation: ${err.message}`;
      err = createError.badRequest(message);
    }
    // Handle general PostgreSQL query errors
    else {
      const message = `Database query error: ${err.message}`;
      err = createError.serverError(message);
    }
  }
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    err = createError.unauthorized("Invalid token. Please log in again!");
  }
  // Handle JWT expiration errors
  else if (err.name === "TokenExpiredError") {
    err = createError.unauthorized(
      "Your token has expired! Please log in again.",
    );
  }
  // Handle validation errors
  else if (err.name === "ValidationError") {
    err = createError.validationError(err.message);
  }
  // Handle cast errors (invalid ObjectId, etc.)
  else if (err.name === "CastError") {
    err = createError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (err instanceof ZodError) {
    err = createError.validationError(formatZodError(err));
  // } else if (err instanceof CallbackVerificationError) {
  //   err = createError.unauthorized(err.message);
  } else if (err.name === CUSTOM_ERROR_NAME) {
    // err = erro
  }
  // If error doesn't match known types, create an internal server error
  else if (!err.statusCode) {
    err = createError.serverError("Something went wrong!!");
  } else {
    err = createError.serverError("Something went wrong!!");
  }

  // Send the error response
  handleErrorResponse(err, req, res);
}

const handleErrorResponse = (
  err: CustomError,
  _req: Request,
  res: Response,
): Response => {
  // Development error response (with stack trace)
  // if (isDevMode) {
  //   // console.log(" >>💥 DEVELOPMENT ERROR >> ", err.statusCode);
  //   // if (isLog) console.error(err);
  //   return res.status(err.statusCode || 500).json({
  //     statusCode: err.statusCode,
  //     success: false,
  //     code: err.code,
  //     error: filterErrMessage(err?.data?.message || err.message),
  //     message: filterErrMessage(err?.data?.message || err.message),
  //     data: err.data,
  //     // stack: isLog ? err.stack : undefined,
  //   });
  // }

  // Production error response (clean, without stack trace)
  if (err.isOperational) {
    // console.log(" >> 💥 OPERATIONAL ERROR >> ", err.statusCode);
    // if (isLog) console.error(err);

    return res.status(err.statusCode || 500).json({
      statusCode: err.statusCode,
      success: false,
      code: err.code,
      error: filterErrMessage(err?.data?.message || err.message),
      message: filterErrMessage(err?.data?.message || err.message),
      data: err.data,
      stack: !IS_PROD ? err.stack : undefined,
    });
  }

  // For programming or unknown errors, don't leak error details
  // console.log(" >> 💥 SYSTEM ERROR >> ", err.statusCode);
  // if (isLog) console.error(err);

  return res.status(500).json({
    statusCode: err.statusCode,
    success: false,
    code: err.code,
    error: filterErrMessage(err?.data?.message || err.message),
    message: filterErrMessage(err?.data?.message || err.message),
    data: err.data,
    stack: !IS_PROD ? err.stack : undefined,
  });
};

// TODO: --- method to filer and remove sensitive data from the error server response, prisma, files, errors, undefined, null, cannot read properties..,  etc.

/**
 * Strips sensitive data, paths, and internal error structures.
 * Securely logs the original error on the server and returns a safe message for clients.
 */
export function filterErrMessage(error: unknown): string {
  if (IS_DEV) return String(error);
  
  const DEFAULT_MESSAGE =
    "An internal server error occurred. Please try again later.";

  if (!error) {
    return DEFAULT_MESSAGE;
  }

  // 1. Extract the raw text message based on the input type
  let rawMessage = "";
  if (typeof error === "string") {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.stack || error.message;
  } else if (typeof error === "object") {
    // Captures nested errors from Axios responses, Prisma objects, or API logs
    const obj = error as Record<string, any>;
    rawMessage = obj.message || obj.error || JSON.stringify(obj);
  }

  // 2. Securely log the detailed error internally before sanitizing it
  logger.error("Internal Server Error Context:", { error: rawMessage });

  // 3. Comprehensive Blacklist Patterns (Case-Insensitive)
  const sensitivePatterns = [
    /prisma/i, // Prisma ORM methods & invocations
    /database/i,
    /sql/i,
    /query/i,
    /mongodb/i, // Database system references
    /[a-zA-Z]:\\/i, // Windows file system paths (e.g., C:\Users\...)
    /\/[a-zA-Z0-9_\-\.]+([\/][a-zA-Z0-9_\-\.]+)+/i, // Unix/Linux/Docker absolute file paths (e.g., /usr/src/app)
    /:\d+:\d+/, // Line and column numbers (e.g., :134:32)
    /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/, // IPv4 Addresses (e.g., 192.168.0.100)
    /at\s+async\s+/i,
    /at\s+Object\./i, // Common stack trace lines
  ];

  // 4. Test the extracted message against our blacklist rules
  const containsSensitiveData = sensitivePatterns.some((pattern) =>
    pattern.test(rawMessage),
  );

  // 5. Fallback or Return Safe Text
  if (containsSensitiveData) {
    return DEFAULT_MESSAGE;
  }

  // Double check to ensure we aren't leaking unusually long stack trace text block arrays
  if (rawMessage.includes("\n") || rawMessage.length > 200) {
    return DEFAULT_MESSAGE;
  }

  return rawMessage;
}

