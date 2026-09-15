import { Express, Request, Response } from "express";
import env, { IS_DEV } from "../shared/config/env";

import { authRoutes } from "../features/auth";
import { usersRoutes } from "../features/users";

// Services
const API_PREFIX = "/api/v1";

/**
 * Configure Express server with all feature routes
 * @param {Express} app - Express application instance
 */
export const configureServerRoutes = (app: Express): void => {
  // API Routes
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, usersRoutes);

  // Root endpoint
  app.get("/", rootHandler);

  // Health check
  app.get(`${API_PREFIX}/healthz`, appHealth);
  app.get(`${API_PREFIX}/status`, rootHandler);

  if (IS_DEV) {
    app.get("/debugxenvvars", envHandler);
    app.get("/debugxenvvarslist", envHandlerList);
  }

  // 404 handler
  app.use(notFoundHandler);
};

// ==================================
// Handlers
// ==================================
function rootHandler(_req: Request, res: Response) {
  res.json({
    title: "iKeen Workspace ::: API V1 :::: @iKeen ASTRO",
    status: "running 🔥",
    timestamp: Date.now(),
  });
}

function appHealth(req: Request, res: Response) {
  res.json({
    success: true,
    message: "Server is running",
    data: {
      success: true,
      message: "iKeen API is running",
      timestamp: new Date().toISOString(),
      websocket: "Enhanced WebSocket server active",

      status: "healthy",
      version: "1.0.0",
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      features: [
        "Real-time WebSocket communication",
        "Live delivery status updates",
        "JWT authentication",
        "Push notifications",
        "File uploads",
        "Rate limiting",
        "Comprehensive logging",
        "Push notifications",
        "Earnings notifications",
        "Request broadcasting",
      ],
    },
  });
}

function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    statusCode: 404,
  });
}

const envHandler = (_req: Request, res: Response) => {
  // Convert process.env into a normal JSON object
  const envVars = Object.fromEntries(
    Object.entries(process.env).map(([key, value]) => [key, value]),
  );

  res.json({
    message: "Environment variables",
    count: Object.keys(envVars).length,
    env: envVars,
  });
};

const envHandlerList = (_req: Request, res: Response) => {
  // Log the contents of the .env file lines 1-69
  // For better context, we just print process.env as per .env config in dev
  console.log("==== .env Values (Lines 1-69) ====");

  const envLines = [
    `NODE_ENV=${process.env.NODE_ENV}`,
    `DEPLOYMENT_PLATFORM=${process.env.DEPLOYMENT_PLATFORM}`,
    `PORT=${process.env.PORT}`,
    ``,
    `# Database`,
    `DATABASE_URL=${process.env.DATABASE_URL}`,
    ``,
    `# JWT`,
    `JWT_SECRET=${process.env.JWT_SECRET}`,
    `JWT_ACCESS_EXPIRATION=${process.env.JWT_ACCESS_EXPIRATION}`,
    `JWT_REFRESH_EXPIRATION=${process.env.JWT_REFRESH_EXPIRATION}`,
    `JWT_VERIFICATION_EXPIRATION=${process.env.JWT_VERIFICATION_EXPIRATION}`,
    `JWT_RESET_PASSWORD_EXPIRATION=${process.env.JWT_RESET_PASSWORD_EXPIRATION}`,
    ``,
    `# Email`,
    `EMAIL_SMTP_HOST=${process.env.EMAIL_SMTP_HOST}`,
    `EMAIL_SMTP_PORT=${process.env.EMAIL_SMTP_PORT}`,
    `EMAIL_SMTP_USERNAME=${process.env.EMAIL_SMTP_USERNAME}`,
    `EMAIL_SMTP_PASSWORD=${process.env.EMAIL_SMTP_PASSWORD}`,
    `EMAIL_FROM=${process.env.EMAIL_FROM}`,
    ``,
    `# Frontend`,
    `FRONTEND_URL=${process.env.FRONTEND_URL}`,
    ``,
    `# ArcJet`,
    `ARCJET_ENV=${process.env.ARCJET_ENV}`,
    `ARCJET_KEY=${process.env.ARCJET_KEY}`,
    ``,
    `# Upstash Workflow`,
    `QSTASH_TOKEN=${process.env.QSTASH_TOKEN}`,
    `QSTASH_URL=${process.env.QSTASH_URL}`,
    ``,
    `# Cloudinary and Uploads`,
    `CLOUDINARY_CLOUD_NAME=${process.env.CLOUDINARY_CLOUD_NAME}`,
    `CLOUDINARY_API_KEY=${process.env.CLOUDINARY_API_KEY}`,
    `CLOUDINARY_API_SECRET=${process.env.CLOUDINARY_API_SECRET}`,
    ``,
    `# Campay`,
    `CAMPAY_API_URL=${process.env.CAMPAY_API_URL}`,
    `CAMPAY_PASSWORD=${process.env.CAMPAY_PASSWORD}`,
    `CAMPAY_USERNAME=${process.env.CAMPAY_USERNAME}`,
    ``,
    `GEO_DEFAULT_RADIUS_KM=${process.env.GEO_DEFAULT_RADIUS_KM}`,
    `GEO_GEOHASH_PRECISION=${process.env.GEO_GEOHASH_PRECISION}`,
    `GEO_MODE=${process.env.GEO_MODE}`,
    ``,
    `# SANDBOX FAPSHI`,
    `FAPSHI_API_BASE_URL=${process.env.FAPSHI_API_BASE_URL}`,
    `FAPSHI_API_USER=${process.env.FAPSHI_API_USER}`,
    `FAPSHI_API_KEY=${process.env.FAPSHI_API_KEY}`,
    ``,
    `# LIVE FAPSHI`,
    `# FAPSHI_API_PAYOUT_USER=${process.env.FAPSHI_API_PAYOUT_USER}`,
    `# FAPSHI_API_PAYOUT_KEY=${process.env.FAPSHI_API_PAYOUT_KEY}`,
    ``,
    `# Pusher`,
    `PUSHER_APP_ID=${process.env.PUSHER_APP_ID}`,
    `PUSHER_KEY=${process.env.PUSHER_KEY}`,
    `PUSHER_SECRET=${process.env.PUSHER_SECRET}`,
    `PUSHER_CLUSTER=${process.env.PUSHER_CLUSTER}`,
  ];

  // console.log(line);

  res.json({
    message: ".env variables (lines 1-69) were logged to server console",
    count: envLines.length,
    data: envLines,
  });
};
