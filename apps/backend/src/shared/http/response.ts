import { Response } from "express";
import { PaginationResult } from "../types";

/**
 * Interface for pagination details
 */

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Response} Express response
 */
export const sendSuccess = (
  res: Response,
  message: string,
  data: any = null,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
  });
};

/**
 * Send a created response (201)
 * @param {Response} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Created resource data
 * @returns {Response} Express response
 */
export const sendCreated = (
  res: Response,
  message: string,
  data?: any
): Response => {
  return sendSuccess(res, message, data, 201);
};

/**
 * Send a no content response (204)
 * @param {Response} res - Express response object
 * @returns {Response} Express response
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Send a paginated response
 * @param {Response} res - Express response object
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @param {Pagination} pagination - Pagination details
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Response} Express response
 */
export const sendPaginated = <T>(
  res: Response,
  message: string,
  pagination: PaginationResult<T>,
  statusCode: number = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    ...pagination,
  });
};
