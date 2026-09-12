;import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import { setupRequestLogger } from "../lib/logger";
import path from "path";
import globalErrorHandler from "../middlewares/global-error";
import env from "./env";

/**
 * Configure Express server with security and performance middleware
 * @param {Express} app - Express application instance
 */
export const configureServerMiddlewares = (app: Express): void => {
  // Setup request logging
  setupRequestLogger(app);

  // // Parse incoming requests with JSON payloads
  app.use(express.json());

  // // Parse incoming requests with URL-encoded payloads (from HTML forms)
  app.use(express.urlencoded({ extended: true }));

  // Parse cookies attached to the client request object
  app.use(cookieParser());

  // Set security HTTP headers
  app.use(helmet());

  // Enable CORS
  app.use(cors());
  const allowedOrigins = env.CORS_ORIGINS?.split(",");
  app.use(cors({ credentials: true, origin: allowedOrigins }));

  // Trust the first proxy (if behind a reverse proxy like Nginx or AWS ELB)
  app.set("trust proxy", 1); // or true

  // TODO: compare with arcjet
  // Limit requests from same IP
  // const limiter = rateLimit({
  //   max: 100, // 100 requests per windowMs
  //   windowMs: 60 * 60 * 1000, // 1 hour
  //   message: "Too many requests from this IP, please try again in an hour!",
  // });
  // app.use("/api", limiter);

  // Prevent parameter pollution
  app.use(
    hpp({
      whitelist: ["price", "rating", "stock", "category", "status"],
    })
  );

  // Compress responses
  app.use(compression());

  // Add request time to req object
  app.use((req, _res, next) => {
    req.requestTime = new Date().toISOString();
    next();
  });

  /**
   * Files and Uploads
   */
  // Serve static files from the uploads directory
  app.use("/", express.static(path.join(__dirname, "../../assets")));
};

/**
 * Configure global error handler - must be called AFTER all routes
 * @param {Express} app - Express application instance
 */
export const configureErrorHandler = (app: Express): void => {
  // Global Error Handler - must have 4 parameters for Express to recognize it as error handler
  app.use(globalErrorHandler);
};
