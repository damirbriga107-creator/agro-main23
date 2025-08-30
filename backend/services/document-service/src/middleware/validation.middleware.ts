import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { logger } from '@daorsagro/utils';

export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : error.type,
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    logger.warn('Validation failed', {
      errors: formattedErrors,
      path: req.path,
      method: req.method
    });

    res.status(422).json({
      error: 'Validation failed',
      message: 'The provided data is invalid',
      details: formattedErrors,
      timestamp: new Date().toISOString()
    });
    return;
  }

  next();
};

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.type === 'field' ? (error as any).path : error.type,
        message: error.msg,
        value: error.type === 'field' ? (error as any).value : undefined
      }));

      logger.warn('Validation failed', {
        errors: formattedErrors,
        path: req.path,
        method: req.method
      });

      res.status(422).json({
        error: 'Validation failed',
        message: 'The provided data is invalid',
        details: formattedErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

// File upload validation
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  if (!req.file && !req.files) {
    res.status(400).json({
      error: 'No file provided',
      message: 'Please select a file to upload'
    });
    return;
  }

  const files = req.files ? 
    (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : 
    [req.file];

  for (const file of files) {
    if (!file) continue;

    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      res.status(415).json({
        error: 'Unsupported file type',
        message: `File type ${file.mimetype} is not supported`,
        allowedTypes
      });
      return;
    }

    // Check file size
    if (file.size > maxFileSize) {
      res.status(413).json({
        error: 'File too large',
        message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds the limit of ${maxFileSize / 1024 / 1024}MB`
      });
      return;
    }
  }

  next();
};