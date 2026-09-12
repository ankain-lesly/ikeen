import app from "./app";
import { logger } from "./shared/lib/logger";
import env from "./shared/config/env";
import { createServer } from "http";
import { log } from "./shared/lib";

const PORT = process.env.PORT || 8383;

// Create HTTP server
const server = createServer(app);

// Start server
// Only listen to the server when running directly (not when imported)
if (env.NODE_ENV === "development" || env.DEPLOYMENT_PLATFORM === "render") {
  server.listen(PORT, async () => {
    console.log(" 🔥 Server Running: Port ::: ", PORT);
    // console.log(" 🔌 WebSocket Server Initialized");
  });
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error(`Unhandled Rejection: ${message}`);
  log(`Unhandled Rejection: ${message}`);
  if (reason instanceof Error && reason.stack) {
    logger.error(reason.stack);
  }
  // In dev, keep the server alive so upload/API failures return JSON instead of killing watch
  if (env.NODE_ENV !== "development") {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  console.error(`Uncaught Exception: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});

const shutdown = (signal: string) => {
  log(`${signal} received — shutting down`);
  server.close(() => process.exit(0));
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export default app;
