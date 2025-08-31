import { Request, Response, NextFunction } from 'express';
import { logger } from '@daorsagro/utils';

interface AuthenticatedRequest extends Request {
  apiKey?: string;
  clientId?: string;
}

interface ApiKeyInfo {
  id: string;
  name: string;
  clientId: string;
  permissions: string[];
  isActive: boolean;
  rateLimits?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  createdAt: Date;
  lastUsed?: Date;
}

// Mock API key storage - in production this would be in a database
const apiKeys = new Map<string, ApiKeyInfo>([
  ['nk_live_12345678901234567890123456789012', {
    id: 'api_1',
    name: 'Frontend Web App',
    clientId: 'web-app',
    permissions: ['notifications.send', 'notifications.read', 'preferences.manage'],
    isActive: true,
    rateLimits: {
      requestsPerMinute: 1000,
      requestsPerHour: 10000,
      requestsPerDay: 100000
    },
    createdAt: new Date('2024-01-01'),
    lastUsed: new Date()
  }],
  ['nk_live_abcdefghijklmnopqrstuvwxyz123456', {
    id: 'api_2',
    name: 'Mobile App',
    clientId: 'mobile-app',
    permissions: ['notifications.send', 'notifications.read', 'devices.register'],
    isActive: true,
    rateLimits: {
      requestsPerMinute: 500,
      requestsPerHour: 5000,
      requestsPerDay: 50000
    },
    createdAt: new Date('2024-01-01'),
    lastUsed: new Date()
  }],
  ['nk_live_systemservice9876543210987654321', {
    id: 'api_3',
    name: 'System Services',
    clientId: 'system',
    permissions: ['notifications.send', 'notifications.bulk', 'analytics.read', 'system.manage'],
    isActive: true,
    rateLimits: {
      requestsPerMinute: 2000,
      requestsPerHour: 50000,
      requestsPerDay: 500000
    },
    createdAt: new Date('2024-01-01'),
    lastUsed: new Date()
  }]
]);

export const validateApiKey = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;

    if (!apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required'
      });
      return;
    }

    // Validate API key format
    if (!apiKey.startsWith('nk_live_') || apiKey.length < 32) {
      logger.warn('Invalid API key format', {
        keyPrefix: apiKey.substring(0, 8),
        ip: req.ip,
        path: req.path
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key format'
      });
      return;
    }

    const keyInfo = apiKeys.get(apiKey);

    if (!keyInfo) {
      logger.warn('Unknown API key attempted access', {
        keyPrefix: apiKey.substring(0, 8),
        ip: req.ip,
        path: req.path
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
      return;
    }

    if (!keyInfo.isActive) {
      logger.warn('Inactive API key attempted access', {
        keyId: keyInfo.id,
        clientId: keyInfo.clientId,
        ip: req.ip,
        path: req.path
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is inactive'
      });
      return;
    }

    // Update last used timestamp
    keyInfo.lastUsed = new Date();

    // Attach key info to request
    req.apiKey = apiKey;
    req.clientId = keyInfo.clientId;

    // Set rate limit headers based on API key limits
    if (keyInfo.rateLimits) {
      res.set({
        'X-RateLimit-Client': keyInfo.clientId,
        'X-RateLimit-Requests-Per-Minute': keyInfo.rateLimits.requestsPerMinute?.toString() || 'unlimited',
        'X-RateLimit-Requests-Per-Hour': keyInfo.rateLimits.requestsPerHour?.toString() || 'unlimited',
        'X-RateLimit-Requests-Per-Day': keyInfo.rateLimits.requestsPerDay?.toString() || 'unlimited'
      });
    }

    logger.info('API key validated successfully', {
      keyId: keyInfo.id,
      clientId: keyInfo.clientId,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('API key validation error:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to validate API key'
    });
  }
};

export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const apiKey = req.apiKey;

      if (!apiKey) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'API key not found in request'
        });
        return;
      }

      const keyInfo = apiKeys.get(apiKey);

      if (!keyInfo) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
        return;
      }

      if (!keyInfo.permissions.includes(permission)) {
        logger.warn('Insufficient permissions for API key', {
          keyId: keyInfo.id,
          clientId: keyInfo.clientId,
          requiredPermission: permission,
          availablePermissions: keyInfo.permissions,
          path: req.path
        });

        res.status(403).json({
          error: 'Forbidden',
          message: `Insufficient permissions. Required: ${permission}`,
          availablePermissions: keyInfo.permissions
        });
        return;
      }

      logger.debug('Permission validated', {
        keyId: keyInfo.id,
        permission,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Permission validation error:', error);
      res.status(500).json({
        error: 'InternalServerError',
        message: 'Failed to validate permissions'
      });
    }
  };
};

export const optionalApiKey = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string || req.query.api_key as string;

  if (!apiKey) {
    next();
    return;
  }

  validateApiKey(req, res, next);
};

// API key management functions (for admin use)
export const createApiKey = (keyInfo: Omit<ApiKeyInfo, 'id' | 'createdAt'>): string => {
  const apiKey = `nk_live_${Math.random().toString(36).substring(2, 34)}`;
  const id = `api_${Date.now()}`;

  apiKeys.set(apiKey, {
    ...keyInfo,
    id,
    createdAt: new Date()
  });

  logger.info('API key created', {
    keyId: id,
    clientId: keyInfo.clientId,
    permissions: keyInfo.permissions
  });

  return apiKey;
};

export const revokeApiKey = (apiKey: string): boolean => {
  const keyInfo = apiKeys.get(apiKey);

  if (!keyInfo) {
    return false;
  }

  keyInfo.isActive = false;

  logger.info('API key revoked', {
    keyId: keyInfo.id,
    clientId: keyInfo.clientId
  });

  return true;
};

export const listApiKeys = (): Array<Omit<ApiKeyInfo, never> & { keyPrefix: string }> => {
  const result: Array<Omit<ApiKeyInfo, never> & { keyPrefix: string }> = [];

  for (const [key, info] of apiKeys.entries()) {
    result.push({
      ...info,
      keyPrefix: key.substring(0, 12) + '...'
    });
  }

  return result;
};

export const getApiKeyUsage = (apiKey: string): {
  keyInfo: ApiKeyInfo;
  usage: {
    totalRequests: number;
    requestsToday: number;
    requestsThisHour: number;
    lastRequest: Date;
  };
} | null => {
  const keyInfo = apiKeys.get(apiKey);

  if (!keyInfo) {
    return null;
  }

  // In production, this would fetch actual usage statistics from database/cache
  return {
    keyInfo,
    usage: {
      totalRequests: 0,
      requestsToday: 0,
      requestsThisHour: 0,
      lastRequest: keyInfo.lastUsed || new Date()
    }
  };
};