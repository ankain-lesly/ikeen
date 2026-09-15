import express from "express";

import { configureServerRoutes } from "./routes";
import {
  configureServerMiddlewares,
  configureErrorHandler,
} from "./shared/config/configure-server";

const app = express();

// Configure server with middleware
configureServerMiddlewares(app);

// Configure routes
configureServerRoutes(app);

// Configure global error handler - MUST be after all routes
configureErrorHandler(app);

export default app;
