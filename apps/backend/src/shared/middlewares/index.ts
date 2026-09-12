/**
 * Middleware Index
 *
 * Central export file for all middleware components used throughout the application.
 * This file consolidates exports from authentication, validation, error handling
 * and other middleware modules for convenient importing.
 */

// Authentication middleware exports
export { default as authenticate, AUTH } from "./auth";

// Error handling middleware exports
export { createError, catchErrorAsync } from "../http/app-error";

// Export all middleware components from their respective modules
export * from "./auth";
export * from "./global-error";
export * from "./validation";
