import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const formattedMessage = `${method} ${originalUrl} ${statusCode} +${duration}ms - ${ip ?? 'unknown'}`;

      if (statusCode >= 500) {
        this.logger.error(formattedMessage);
      } else if (statusCode >= 400) {
        this.logger.warn(formattedMessage);
      } else {
        this.logger.log(formattedMessage);
      }
    });

    next();
  }
}
