import crypto from "crypto";
import { PrismaClient } from "../../../prisma/generated/client";
import { PaginationOptions, PaginationResult } from "../types";

// Generates a username
export async function generateUsername(
  firstName: string,
  lastName: string,
  prisma: PrismaClient,
): Promise<string> {
  const baseUsername = (
    firstName.toLowerCase() + lastName.toLowerCase()
  ).replace(/[^a-z0-9]/g, "");
  let username = baseUsername;
  let counter = 1;

  while (true) {
    // Check if the username exists in the database using prisma.user.count
    const userCount = await prisma.user.count({
      where: {
        username: username,
      },
    });

    if (userCount === 0) {
      // Username is unique
      break;
    }

    // TODO: ---
    username = baseUsername + counter;
    counter++;
  }

  return username;
}

export function generateFirstAndLastName(fullName: string) {
  // Trim the input to remove any leading or trailing whitespace
  const trimmedName = fullName.trim();

  // Split the full name into an array of names
  const nameParts = trimmedName.split(" ");

  // Join the rest of the parts as the last name
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  return { firstName: nameParts[0], lastName };
}

// Generate slug from string
export const generateSlug = (
  text: string,
  join: "-" | "_" | "" = "",
): string => {
  // 1. Normalize curly quotes and smart punctuation to ASCII equivalents
  text = text
    .replace(/[’‘]/g, "'") // smart single quotes → '
    .replace(/[“”]/g, '"') // smart double quotes → "
    .replace(/–|—/g, "-"); // en/em dashes → -

  let slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric, spaces, and hyphens
    // .replace(/\s+/g, "-") // Replace spaces with hyphens
    // .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/-+/g, "-") // Remove duplicate hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  slug = slug.replace(/\s+/g, join); // Replace spaces with hyphens

  return slug;
};

/**
 * Generate a unique slug by checking against the database using Prisma.
 * @param model - Prisma model to check against
 * @param whereKey - The key to check against.
 * @param productName - The product name to generate slug from.
 * @returns A unique slug string.
 */
export async function generateUniqueSlug(
  model: any,
  whereKey: any,
  value: string,
  join: "-" | "_" | "" = "-",
): Promise<string> {
  const baseSlug = generateSlug(value, join);
  let uniqueSlug = baseSlug;
  // TODO: ---
  let counter = 1;

  while (true) {
    // Check if slug exists in the database
    const existing = await model.findFirst({
      where: {
        [whereKey]: uniqueSlug,
      },
      select: { id: true }, // Only select id for performance
    });

    // Slug does not exist, safe to use
    if (!existing) break;

    // Slug exists, append counter and try again
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }
  return uniqueSlug;
}

export const paginateResults = async <T, K = any>(
  model: any,
  { language, ...options }: PaginationOptions & any = {},
): Promise<PaginationResult<T>> => {
  const {
    page: initPage,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
    ...rest
  } = options;

  const page = Number(initPage) || 1;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      orderBy: { [sortBy]: sortOrder },
      ...rest,
      skip,
      take: Number(limit),
    }),
    model.count({ where: rest.where }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages,
      hasNextPage: page < pages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Generate a secure random token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// Generate OPT Code
export function generateOTPCode(length = 6) {
  // Generate a random integer between 0 and 999999 inclusive
  const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit code
  // Pad with leading zeros to ensure 6 digits
  return otp.toString().padStart(length, "0");
}

// Improved Pretty Console Log for Debug/Tests
export function log(...data: unknown[]) {
  const prettyData = data
    .map((d) => {
      if (d === null || d === undefined) return String(d); // Handle null/undefined explicitly
      if (typeof d === "object" || typeof d === "bigint") {
        try {
          // Handle circular refs: replace with '[Circular]' or skip
          return JSON.stringify(
            d,
            (key, value) => {
              if (key === "[Circular Reference]") return "[Circular]";
              if (typeof value === "bigint") return value.toString();
              return value;
            },
            2,
          );
        } catch (e: any) {
          return `[Error stringifying: ${e.message}]`;
        }
      }
      return String(d); // Coerce primitives to string for consistency
    })
    .join("\n"); // Join with \n to avoid console.log spaces

  if (prettyData) {
    // console.log("✨ [LOG] ✨");
    console.log("\n[LOG] ");
    console.log(prettyData); // Single call, no extra newlines
  }
}