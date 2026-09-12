import { Request } from "express";
import { PaginationOptions } from "../types";
import { PAGINATION } from "../constants";

/**
 * Extract pagination parameters from request query
 * @param {Request} req - Express request object
 * @returns {PaginationOptions} Pagination parameters
 */
export const getPaginationParams = (req: Request): PaginationOptions => {
  const page = Number(req.query.page) || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(
    Number(req.query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );

  return {
    page,
    limit,
    // TODO: ---
    // select: (page - 1) * limit,
    // skip: (page - 1) * limit,
  };
};

/**
 * Extract sorting parameters from request query
 * @param {Request} req - Express request object
 * @param {string} defaultSortField - Default field to sort by
 * @returns {Record<string, 1 | -1>} Sorting parameters for MongoDB
 */
export const getSortParams = (
  req: Request,
  defaultSortField = "createdAt"
): Record<string, 1 | -1> => {
  const sortBy: Record<string, 1 | -1> = {};

  if (req.query.sort) {
    const sortFields = (req.query.sort as string).split(",");

    sortFields.forEach((field) => {
      if (field.startsWith("-")) {
        sortBy[field.substring(1)] = -1;
      } else {
        sortBy[field] = 1;
      }
    });
  } else {
    sortBy[defaultSortField] = -1;
  }

  return sortBy;
};

/**
 * Extract filtering parameters from request query
 * @param {Request} req - Express request object
 * @param {string[]} excludedFields - Fields to exclude from filtering
 * @returns {Record<string, any>} Filtering parameters for MongoDB
 */
export const getFilterParams = (
  req: Request,
  excludedFields: string[] = ["page", "sort", "limit", "fields"]
): Record<string, any> => {
  const queryObj = { ...req.query };

  excludedFields.forEach((field) => delete queryObj[field]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(
    /\b(gte|gt|lte|lt|eq|ne|in)\b/g,
    (match) => `$${match}`
  );

  return JSON.parse(queryStr);
};

// module.exports = {
//   getPaginationParams,
//   getSortParams,
//   getFilterParams,
//   getFieldsSelection,
//   validateRequestBody,
//   cleanRequestBody,
// };
