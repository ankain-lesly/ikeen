import { Express, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import winston from "winston";
import env from "../config/env";
import Transport from "winston-transport";

class TelegramTransport extends Transport {
  constructor(opts?: any) {
    super(opts);
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    callback();
  }
}


// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const IS_DEV = env.NODE_ENV === "development";
// Checking env setup
const level = () => {
  return IS_DEV ? "debug" : "warn";
};

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Create logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: [...configLoggerMode()],
});

function configLoggerMode() {
  return !IS_DEV
    ? [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ]
    : [
        new winston.transports.File({
          filename: "logs/error.log",
          level: "error",
        }),
        new winston.transports.File({ filename: "logs/combined.log" }),
      ];
}

interface RequestWithBody extends Request {
  body: Record<string, unknown>;
}

const sanitizeBody = (
  body: Record<string, unknown>,
): Record<string, unknown> => {
  if (IS_DEV) {
    return body;
  }
  const sanitized = { ...body };
  const sensitiveFields = ["password", "passwordConfirm", "token"];

  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  });

  if (typeof sanitized.email === "string") {
    sanitized.email = sanitized.email.split("@")[0] + "@[REDACTED]";
  }

  return sanitized;
};

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

const getStatusColor = (status: number): string => {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.reset;
};

const setupRequestLogger = (app: Express): void => {
  if (IS_DEV) {
    morgan.token("body", (req: RequestWithBody) =>
      JSON.stringify(sanitizeBody(req.body)),
    );

    // Custom colored format
    morgan.token("status-colored", (req, res) => {
      const status = res.statusCode;
      const color = getStatusColor(status);
      return `${color}${status}${colors.reset}`;
    });

    morgan.token("method-colored", (req) => {
      return `${colors.cyan}${req.method}${colors.reset}`;
    });

    morgan.token("url-colored", (req) => {
      return `${colors.gray}${req.url}${colors.reset}`;
    });

    morgan.token("response-time-colored", (req, res) => {
      const responseTime =
        res.getHeader("X-Response-Time") || (res as any).responseTime || "";
      return `${colors.magenta}${responseTime}${colors.reset}`;
    });

    app.use(
      morgan(
        ":method-colored :url-colored :status-colored :response-time ms - :body",
      ),
    );
  }

  app.use((req: RequestWithBody, res: Response, next: NextFunction) => {
    const start = Date.now();

    // TODO: Log response when it starts
    // Log response after it's sent
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
};

export { logger, setupRequestLogger };
