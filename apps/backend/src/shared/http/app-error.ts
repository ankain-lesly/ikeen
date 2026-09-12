import ENV from "../config/env";
import { Request, Response, NextFunction } from "express";
import { filterErrMessage } from "../middlewares";

export const CUSTOM_ERROR_NAME = "AppCustomError";
/**
 * Interface for application error
 */
interface AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;
  data: any | null;
}

/**
 * Create an application error object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} data - Additional error data
 * @returns {AppError} Error object with additional properties
 */

const createAppError = (
  message: string,
  statusCode: number,
  data: any = null,
): AppError => {
  const filteredMessage = filterErrMessage(message);
  const error = new Error(filteredMessage) as AppError;
  error.statusCode = statusCode;
  error.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
  error.isOperational = true;
  error.name = CUSTOM_ERROR_NAME;
  error.message = filteredMessage;
  // error.error = filteredMessage;
  error.data = data;

  if (ENV.NODE_ENV === "development")
    Error.captureStackTrace(error, createAppError);

  return error;
};

/**
 * Factory functions to create common error types
 */
export const createError = {
  badRequest: (message?: string, data?: any): AppError =>
    createAppError(message || "Bad request", 400, data),
  unauthorized: (message?: string, data?: any): AppError =>
    createAppError(message || "Unauthorized", 401, data),
  forbidden: (message?: string, data?: any): AppError =>
    createAppError(message || "Forbidden", 403, data),
  notFound: (message?: string, data?: any): AppError =>
    createAppError(message || "Resource not found", 404, data),
  conflict: (message?: string, data?: any): AppError =>
    createAppError(message || "Conflict", 409, data),
  validationError: (message?: string, data?: any): AppError =>
    createAppError(message || "Validation error", 422, data),
  tooManyRequests: (message?: string, data?: any): AppError =>
    createAppError(message || "Too many requests", 429, data),
  serverError: (message?: string, data?: any): AppError =>
    createAppError(message || "Internal server error", 500, data),
};

/**
 * Error handler for async functions to avoid try/catch blocks
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
export const catchErrorAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handler wrapper
// const catchErrorAsync = (fn: Function) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     return Promise.resolve(fn(req, res, next)).catch(next);
//   };
// };
