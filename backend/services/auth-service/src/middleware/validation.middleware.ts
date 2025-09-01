import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from './error-handler.middleware';
import { Logger } from '../utils/logger';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

export interface ValidationOptions {
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}

/**
 * Enhanced Validation Middleware with Joi schema validation
 */
export class ValidationMiddleware {
  private static logger = new Logger('validation-middleware');

  /**
   * Validate request using Joi schemas
   */
  public static validate = (schema: ValidationSchema, options: ValidationOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const validationOptions: Joi.ValidationOptions = {
        allowUnknown: options.allowUnknown ?? false,
        stripUnknown: options.stripUnknown ?? true,
        abortEarly: options.abortEarly ?? false,
        ...options
      };

      const errors: any[] = [];

      try {
        // Validate body
        if (schema.body) {
          const { error, value } = schema.body.validate(req.body, validationOptions);
          if (error) {
            errors.push(...error.details);
          } else {
            req.body = value;
          }
        }

        // Validate query
        if (schema.query) {
          const { error, value } = schema.query.validate(req.query, validationOptions);
          if (error) {
            errors.push(...error.details);
          } else {
            req.query = value;
          }
        }

        // Validate params
        if (schema.params) {
          const { error, value } = schema.params.validate(req.params, validationOptions);
          if (error) {
            errors.push(...error.details);
          } else {
            req.params = value;
          }
        }

        // Validate headers
        if (schema.headers) {
          const { error, value } = schema.headers.validate(req.headers, validationOptions);
          if (error) {
            errors.push(...error.details);
          } else {
            req.headers = { ...req.headers, ...value };
          }
        }

        if (errors.length > 0) {
          const validationError = new ValidationError(
            'Validation failed',
            errors.map(err => ({
              field: err.path?.join('.'),
              message: err.message,
              value: err.context?.value,
              type: err.type
            }))
          );

          ValidationMiddleware.logger.warn('Validation failed', {
            requestId: req.headers['x-request-id'],
            errors: validationError.details,
            path: req.originalUrl,
            method: req.method
          });

          throw validationError;
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };

  /**
   * Common validation schemas
   */
  public static schemas = {
    // ID parameter validation
    id: Joi.object({
      id: Joi.string().uuid().required().messages({
        'string.guid': 'ID must be a valid UUID',
        'any.required': 'ID is required'
      })
    }),

    // Pagination query validation
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().optional(),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    }),

    // Email validation
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .messages({
        'string.email': 'Must be a valid email address',
        'any.required': 'Email is required'
      }),

    // Password validation
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),

    // Phone number validation
    phone: Joi.string()
      .pattern(new RegExp('^[+]?[1-9]\\d{1,14}$'))
      .optional()
      .messages({
        'string.pattern.base': 'Phone number must be in valid international format'
      }),

    // Name validation
    name: Joi.string()
      .min(1)
      .max(100)
      .trim()
      .required()
      .messages({
        'string.min': 'Name must not be empty',
        'string.max': 'Name must not exceed 100 characters',
        'any.required': 'Name is required'
      }),

    // Date validation
    date: Joi.date()
      .iso()
      .messages({
        'date.format': 'Date must be in ISO 8601 format (YYYY-MM-DD)'
      }),

    // File upload validation
    file: Joi.object({
      fieldname: Joi.string().required(),
      originalname: Joi.string().required(),
      encoding: Joi.string().required(),
      mimetype: Joi.string().required(),
      size: Joi.number().max(10 * 1024 * 1024), // 10MB
      buffer: Joi.binary().required()
    })
  };

  /**
   * Authentication validation schemas
   */
  public static authSchemas = {
    // User registration
    register: {
      body: Joi.object({
        email: ValidationMiddleware.schemas.email,
        password: ValidationMiddleware.schemas.password,
        firstName: ValidationMiddleware.schemas.name,
        lastName: ValidationMiddleware.schemas.name,
        phone: ValidationMiddleware.schemas.phone,
        farmName: Joi.string().min(1).max(200).optional(),
        farmLocation: Joi.string().min(1).max(200).optional(),
        acceptedTerms: Joi.boolean().valid(true).required().messages({
          'any.only': 'You must accept the terms and conditions'
        })
      })
    },

    // User login
    login: {
      body: Joi.object({
        email: ValidationMiddleware.schemas.email,
        password: Joi.string().required().messages({
          'any.required': 'Password is required'
        }),
        rememberMe: Joi.boolean().default(false)
      })
    },

    // Password reset request
    forgotPassword: {
      body: Joi.object({
        email: ValidationMiddleware.schemas.email
      })
    },

    // Password reset
    resetPassword: {
      body: Joi.object({
        token: Joi.string().required().messages({
          'any.required': 'Reset token is required'
        }),
        password: ValidationMiddleware.schemas.password
      })
    },

    // Change password
    changePassword: {
      body: Joi.object({
        currentPassword: Joi.string().required().messages({
          'any.required': 'Current password is required'
        }),
        newPassword: ValidationMiddleware.schemas.password
      })
    },

    // Email verification
    verifyEmail: {
      body: Joi.object({
        token: Joi.string().required().messages({
          'any.required': 'Verification token is required'
        })
      })
    },

    // Two-factor authentication
    verify2FA: {
      body: Joi.object({
        code: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
          'string.length': '2FA code must be exactly 6 digits',
          'string.pattern.base': '2FA code must contain only numbers',
          'any.required': '2FA code is required'
        })
      })
    },

    // Update profile
    updateProfile: {
      body: Joi.object({
        firstName: ValidationMiddleware.schemas.name.optional(),
        lastName: ValidationMiddleware.schemas.name.optional(),
        phone: ValidationMiddleware.schemas.phone,
        farmName: Joi.string().min(1).max(200).optional(),
        farmLocation: Joi.string().min(1).max(200).optional(),
        dateOfBirth: ValidationMiddleware.schemas.date.optional(),
        avatar: Joi.string().uri().optional()
      }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
      })
    }
  };

  /**
   * Farm management validation schemas
   */
  public static farmSchemas = {
    // Create farm
    createFarm: {
      body: Joi.object({
        name: Joi.string().min(1).max(200).required().messages({
          'string.empty': 'Farm name is required',
          'string.min': 'Farm name must be at least 1 character long',
          'string.max': 'Farm name must not exceed 200 characters',
          'any.required': 'Farm name is required'
        }),
        description: Joi.string().max(1000).optional().allow(''),
        totalAcres: Joi.number().positive().precision(2).required().messages({
          'number.positive': 'Total acres must be a positive number',
          'any.required': 'Total acres is required'
        }),
        farmType: Joi.string().valid('CROP', 'LIVESTOCK', 'MIXED', 'DAIRY', 'POULTRY', 'AQUACULTURE').required().messages({
          'any.only': 'Farm type must be one of: CROP, LIVESTOCK, MIXED, DAIRY, POULTRY, AQUACULTURE',
          'any.required': 'Farm type is required'
        }),
        address: Joi.string().min(1).max(500).required().messages({
          'string.empty': 'Address is required',
          'any.required': 'Address is required'
        }),
        city: Joi.string().min(1).max(100).required().messages({
          'string.empty': 'City is required',
          'any.required': 'City is required'
        }),
        state: Joi.string().min(1).max(100).required().messages({
          'string.empty': 'State is required',
          'any.required': 'State is required'
        }),
        country: Joi.string().min(1).max(100).required().messages({
          'string.empty': 'Country is required',
          'any.required': 'Country is required'
        }),
        zipCode: Joi.string().min(1).max(20).required().messages({
          'string.empty': 'Zip code is required',
          'any.required': 'Zip code is required'
        }),
        latitude: Joi.number().min(-90).max(90).precision(8).required().messages({
          'number.min': 'Latitude must be between -90 and 90',
          'number.max': 'Latitude must be between -90 and 90',
          'any.required': 'Latitude is required'
        }),
        longitude: Joi.number().min(-180).max(180).precision(8).required().messages({
          'number.min': 'Longitude must be between -180 and 180',
          'number.max': 'Longitude must be between -180 and 180',
          'any.required': 'Longitude is required'
        }),
        certifications: Joi.array().items(Joi.string().max(100)).optional().default([])
      })
    },

    // Update farm
    updateFarm: {
      body: Joi.object({
        name: Joi.string().min(1).max(200).optional(),
        description: Joi.string().max(1000).optional().allow(''),
        totalAcres: Joi.number().positive().precision(2).optional(),
        farmType: Joi.string().valid('CROP', 'LIVESTOCK', 'MIXED', 'DAIRY', 'POULTRY', 'AQUACULTURE').optional(),
        address: Joi.string().min(1).max(500).optional(),
        city: Joi.string().min(1).max(100).optional(),
        state: Joi.string().min(1).max(100).optional(),
        country: Joi.string().min(1).max(100).optional(),
        zipCode: Joi.string().min(1).max(20).optional(),
        latitude: Joi.number().min(-90).max(90).precision(8).optional(),
        longitude: Joi.number().min(-180).max(180).precision(8).optional(),
        certifications: Joi.array().items(Joi.string().max(100)).optional(),
        isActive: Joi.boolean().optional()
      }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
      })
    },

    // Add farm member
    addMember: {
      body: Joi.object({
        email: ValidationMiddleware.schemas.email,
        role: Joi.string().valid('OWNER', 'MANAGER', 'MEMBER', 'VIEWER').required().messages({
          'any.only': 'Role must be one of: OWNER, MANAGER, MEMBER, VIEWER',
          'any.required': 'Role is required'
        })
      })
    },

    // Update farm member
    updateMember: {
      body: Joi.object({
        role: Joi.string().valid('OWNER', 'MANAGER', 'MEMBER', 'VIEWER').required().messages({
          'any.only': 'Role must be one of: OWNER, MANAGER, MEMBER, VIEWER',
          'any.required': 'Role is required'
        })
      })
    }
  };

  /**
   * Crop management validation schemas
   */
  public static cropSchemas = {
    // Create crop
    createCrop: {
      body: Joi.object({
        name: Joi.string().min(1).max(200).required().messages({
          'string.empty': 'Crop name is required',
          'string.min': 'Crop name must be at least 1 character long',
          'string.max': 'Crop name must not exceed 200 characters',
          'any.required': 'Crop name is required'
        }),
        variety: Joi.string().max(100).optional().allow(''),
        acres: Joi.number().positive().precision(2).required().messages({
          'number.positive': 'Acres must be a positive number',
          'any.required': 'Acres is required'
        }),
        plantingDate: Joi.date().optional().allow(null),
        expectedHarvestDate: Joi.date().optional().allow(null),
        seasonYear: Joi.number().integer().min(2000).max(3000).required().messages({
          'number.integer': 'Season year must be an integer',
          'number.min': 'Season year must be 2000 or later',
          'number.max': 'Season year must be 3000 or earlier',
          'any.required': 'Season year is required'
        }),
        expectedYield: Joi.number().positive().precision(2).optional().allow(null),
        yieldUnit: Joi.string().max(50).optional().allow('')
      })
    },

    // Update crop
    updateCrop: {
      body: Joi.object({
        name: Joi.string().min(1).max(200).optional(),
        variety: Joi.string().max(100).optional().allow(''),
        acres: Joi.number().positive().precision(2).optional(),
        plantingDate: Joi.date().optional().allow(null),
        expectedHarvestDate: Joi.date().optional().allow(null),
        actualHarvestDate: Joi.date().optional().allow(null),
        status: Joi.string().valid('PLANNED', 'PLANTED', 'GROWING', 'HARVESTED', 'SOLD').optional(),
        seasonYear: Joi.number().integer().min(2000).max(3000).optional(),
        expectedYield: Joi.number().positive().precision(2).optional().allow(null),
        actualYield: Joi.number().positive().precision(2).optional().allow(null),
        yieldUnit: Joi.string().max(50).optional().allow('')
      }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
      })
    },

    // Record harvest
    recordHarvest: {
      body: Joi.object({
        actualYield: Joi.number().positive().precision(2).required().messages({
          'number.positive': 'Actual yield must be a positive number',
          'any.required': 'Actual yield is required'
        }),
        actualHarvestDate: Joi.date().optional().default(() => new Date()),
        yieldUnit: Joi.string().max(50).optional()
      })
    }
  };

  /**
   * Query parameter validation schemas
   */
  public static querySchemas = {
    // User listing
    userList: {
      query: Joi.object({
        ...ValidationMiddleware.schemas.pagination.describe().keys,
        search: Joi.string().min(1).max(100).optional(),
        role: Joi.string().valid('FARMER', 'ADMIN', 'SUPPORT').optional(),
        status: Joi.string().valid('ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED').optional(),
        verified: Joi.boolean().optional(),
        createdAfter: ValidationMiddleware.schemas.date.optional(),
        createdBefore: ValidationMiddleware.schemas.date.optional()
      })
    },

    // Activity logs
    activityLogs: {
      query: Joi.object({
        ...ValidationMiddleware.schemas.pagination.describe().keys,
        userId: Joi.string().uuid().optional(),
        action: Joi.string().optional(),
        resource: Joi.string().optional(),
        startDate: ValidationMiddleware.schemas.date.optional(),
        endDate: ValidationMiddleware.schemas.date.optional()
      })
    }
  };

  /**
   * Sanitize input by removing potential XSS threats
   */
  public static sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return obj
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      
      return obj;
    };

    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };

  /**
   * Validate file upload
   */
  public static validateFileUpload = (options: {
    maxSize?: number;
    allowedMimeTypes?: string[];
    required?: boolean;
  } = {}) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const {
        maxSize = 10 * 1024 * 1024, // 10MB default
        allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
        required = false
      } = options;

      if (!req.file && required) {
        return next(new ValidationError('File is required'));
      }

      if (req.file) {
        // Check file size
        if (req.file.size > maxSize) {
          return next(new ValidationError(`File size must not exceed ${maxSize / 1024 / 1024}MB`));
        }

        // Check MIME type
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          return next(new ValidationError(`File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`));
        }

        ValidationMiddleware.logger.debug('File upload validated', {
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
          requestId: req.headers['x-request-id']
        });
      }

      next();
    };
  };

  /**
   * Rate limiting validation
   */
  public static validateRateLimit = (req: Request, res: Response, next: NextFunction): void => {
    const rateLimitInfo = {
      limit: res.getHeader('X-RateLimit-Limit'),
      remaining: res.getHeader('X-RateLimit-Remaining'),
      reset: res.getHeader('X-RateLimit-Reset')
    };

    if (rateLimitInfo.remaining === '0') {
      ValidationMiddleware.logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        requestId: req.headers['x-request-id']
      });
    }

    next();
  };

  /**
   * Validate UUID parameter
   */
  public static validateUUID = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const paramValue = req.params[paramName];
      
      if (!paramValue) {
        return next(new ValidationError(`Parameter ${paramName} is required`));
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(paramValue)) {
        return next(new ValidationError(`Invalid ${paramName} format. Must be a valid UUID`));
      }

      ValidationMiddleware.logger.debug(`UUID parameter validated: ${paramName}`, {
        value: paramValue,
        requestId: req.headers['x-request-id']
      });

      next();
    };
  };
}