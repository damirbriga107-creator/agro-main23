import { Request, Response, NextFunction } from 'express';
import { logger } from '@daorsagro/utils';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class InMemoryStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  get(key: string): { count: number; resetTime: number } | null {
    const entry = this.store[key];
    if (!entry) return null;

    if (Date.now() > entry.resetTime) {
      delete this.store[key];
      return null;
    }

    return entry;
  }

  set(key: string, value: { count: number; resetTime: number }): void {
    this.store[key] = value;
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    let entry = this.get(key);

    if (!entry) {
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      entry.count++;
    }

    this.set(key, entry);
    return entry;
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

interface RateLimitOptions {
  windowMs?: number;        // Time window in milliseconds
  max?: number;            // Max requests per window
  message?: string;        // Error message when limit exceeded
  standardHeaders?: boolean; // Send standard headers
  legacyHeaders?: boolean;  // Send legacy headers
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

const defaultOptions: Required<Omit<RateLimitOptions, 'onLimitReached'>> = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || req.connection.remoteAddress || 'unknown',
  skipSuccessfulRequests: false,
  skipFailedRequests: false
};

const store = new InMemoryStore();

export const createRateLimit = (options: RateLimitOptions = {}) => {
  const opts = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = opts.keyGenerator(req);
    const now = Date.now();

    try {
      const result = store.increment(key, opts.windowMs);
      const { count, resetTime } = result;

      // Set headers
      if (opts.standardHeaders) {
        res.set({
          'RateLimit-Limit': opts.max.toString(),
          'RateLimit-Remaining': Math.max(0, opts.max - count).toString(),
          'RateLimit-Reset': new Date(resetTime).toISOString()
        });
      }

      if (opts.legacyHeaders) {
        res.set({
          'X-RateLimit-Limit': opts.max.toString(),
          'X-RateLimit-Remaining': Math.max(0, opts.max - count).toString(),
          'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
        });
      }

      if (count > opts.max) {
        logger.warn('Rate limit exceeded', {
          ip: key,
          path: req.path,
          method: req.method,
          count,
          limit: opts.max,
          resetTime: new Date(resetTime).toISOString()
        });

        if (options.onLimitReached) {
          options.onLimitReached(req, res);
        }

        res.status(429).json({
          error: 'TooManyRequests',
          message: opts.message,
          retryAfter: Math.ceil((resetTime - now) / 1000),
          limit: opts.max,
          remaining: 0,
          reset: new Date(resetTime).toISOString()
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // Continue on error to avoid blocking legitimate requests
      next();
    }
  };
};

// Default rate limiter
export const rateLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per 15 minutes per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true
});

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000,   // 5 minutes
  max: 10,                   // 10 requests per 5 minutes per IP
  message: 'Rate limit exceeded for this endpoint',
  standardHeaders: true,
  onLimitReached: (req: Request, res: Response) => {
    logger.warn('Strict rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent')
    });
  }
});

// API key based rate limiter
export const apiKeyRateLimiter = createRateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 1000,                 // 1000 requests per minute per API key
  keyGenerator: (req: Request) => {
    // Use API key if available, fallback to IP
    return req.headers['x-api-key'] as string || req.ip || 'unknown';
  },
  message: 'API rate limit exceeded'
});

// Cleanup function for graceful shutdown
export const cleanupRateLimit = (): void => {
  store.destroy();
};