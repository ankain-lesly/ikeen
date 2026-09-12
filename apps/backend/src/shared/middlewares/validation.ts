import type { Request, Response, NextFunction } from "express";
import { createError } from "../http/app-error";
import { z, ZodError, type ZodSchema } from "zod";
// import { log } from "../lib";

export function validate(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
      // schema.parse(req.body);
      // next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        // log(error);
        const validationErrors = error.errors || [];
        const message = validationErrors
          .map((err: any) => err.message)
          .join(", ");
        next(createError.validationError(message, validationErrors));
      } else {
        // Handle other types of errors if necessary
        next(error);
      }
    }
  };
}

// ==============================
// Reusable Validators
// ==============================

// Core location validation schema
export const LocationDataSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90, "Invalid latitude"),
  longitude: z.coerce.number().min(-180).max(180, "Invalid longitude"),
  heading: z.number().optional(),
  speed: z.number().optional(),
  accuracy: z.number().optional(),
});

export type LocationDataInput = z.infer<typeof LocationDataSchema>;
