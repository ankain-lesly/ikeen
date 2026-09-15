import { Express, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import winston from "winston";
import env from "../config/env";
import Transport from "winston-transport";

// Removed TelegramTransport for now since it's not used and "fixx" could refer to tidying up dead code

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const IS_DEV = env.NODE_ENV === "development";
const IS_PROD = env.NODE_ENV === "production";

const getLogLevel = () => (IS_DEV ? "debug" : "warn");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

function getLoggerTransports() {
  if (IS_DEV) {
    // In dev, log to console only for everything
    return [
      new winston.transports.Console({
        format: winston.format.simple()
      })
    ];
  } else {
    // In prod, log to files
    return [
      new winston.transports.File({
        filename: "logs/error.log",
        level: "error"
      }),
      new winston.transports.File({
        filename: "logs/combined.log"
      })
    ];
  }
}

// Winston logger instance
const logger = winston.createLogger({
  level: getLogLevel(),
  levels,
  format: logFormat,
  transports: getLoggerTransports()
});

interface RequestWithBody extends Request {
  body: Record<string, any>;
}

const sanitizeBody = (body: Record<string, any>): Record<string, any> => {
  if (IS_DEV) return body;
  const sanitized = { ...body };
  const sensitiveFields = ["password", "passwordConfirm", "token"];

  sensitiveFields.forEach(field => {
    // TODO: Object.hasOwn is not supported in older browsers, use Object.prototype.hasOwnProperty.call instead if valid
    if (Object.prototype.hasOwnProperty.call(sanitized, field)) {
      sanitized[field] = "[REDACTED]";
    }
  });

  if (typeof sanitized.email === "string") {
    sanitized.email = sanitized.email.split("@")[0] + "@[REDACTED]";
  }

  return sanitized;
};

const setupRequestLogger = (app: Express): void => {
  if (IS_DEV) {
    app.use(
      morgan((tokens, req, res) => {
        const method = tokens.method(req, res) || "";
        const url = tokens.url(req, res) || "";
        const status = tokens.status(req, res) || "";
        const responseTime = tokens["response-time"](req, res) || "0";

        let bodyStr = "";
        if (req.method !== "GET" && req.method !== "HEAD") {
          const sanitized = sanitizeBody((req as RequestWithBody).body);
          if (sanitized && Object.keys(sanitized).length > 0) {
            bodyStr = ` - ${JSON.stringify(sanitized)}`;
          }
        }

        return `${method} ${url} ${status} ${responseTime} ms${bodyStr}`;
      })
    );
  }

  // In production, log completed requests via Winston file transport
  if (!IS_DEV) {
    app.use((req: RequestWithBody, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info("Request Completed", {
          method: req.method,
          url: req.url,
          status: res.statusCode,
          duration: `${duration}ms`,
          body: sanitizeBody(req.body),
          ip: req.ip,
        });
      });

      next();
    });
  }
};

export { logger, setupRequestLogger };
