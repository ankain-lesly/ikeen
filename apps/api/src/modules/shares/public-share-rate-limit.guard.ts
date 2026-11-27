import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export interface ShareRateLimitOptions {
  limit: number;
  windowMs: number;
  bucket: string;
}

export const SHARE_RATE_LIMIT_KEY = 'share_rate_limit';

export const ShareRateLimit = (options: ShareRateLimitOptions) =>
  SetMetadata(SHARE_RATE_LIMIT_KEY, options);

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface HttpRequestLike {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

const DEFAULT_OPTIONS: ShareRateLimitOptions = {
  limit: 60,
  windowMs: 60_000,
  bucket: 'public-read',
};

const MAX_STORE_SIZE = 5_000;

@Injectable()
export class PublicShareRateLimitGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options =
      this.reflector.getAllAndOverride<ShareRateLimitOptions>(
        SHARE_RATE_LIMIT_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? DEFAULT_OPTIONS;

    const req = context.switchToHttp().getRequest<HttpRequestLike>();
    const ip = this.resolveClientIp(req);
    const key = `${options.bucket}:${ip}`;
    const now = Date.now();

    if (this.store.size > MAX_STORE_SIZE) {
      this.pruneExpired(now);
    }

    const existing = this.store.get(key);
    if (!existing || existing.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (existing.count >= options.limit) {
      throw new HttpException(
        'Too many requests. Please try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    return true;
  }

  private resolveClientIp(req: HttpRequestLike): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) return first;
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  private pruneExpired(now: number): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
