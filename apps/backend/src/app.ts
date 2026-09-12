import express from "express";

import pawapayCallbackRoutes from "./features/payments/callbacks/pawapay-callback.routes";
import { configureServerRoutes } from "./routes";
import {
  configureServerMiddlewares,
  configureErrorHandler,
} from "./shared/config/configure-server";

const app = express();

// pawaPay callbacks need raw body for RFC 9421 signature verification
app.use(
  "/api/v1/payments/callbacks/pawapay",
  express.raw({ type: "application/json" }),
  pawapayCallbackRoutes,
);

// Configure server with middleware
configureServerMiddlewares(app);

// Configure routes
configureServerRoutes(app);

// Configure global error handler - MUST be after all routes
configureErrorHandler(app);

export default app;
