import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { 
  PolicyType, 
  PolicyStatus, 
  ClaimStatus, 
  RiskLevel,
  validatePolicyType,
  validateClaimStatus,
  validateRiskLevel
} from '../models/insurance.model';

export class ValidationMiddleware {
  static validate(validations: ValidationChain[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Run all validations
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: errors.array(),
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id']
          }
        });
      }

      next();
    };
  }

  // Policy validations
  static validateCreatePolicy() {
    return [
      body('userId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('User ID is required'),
      body('farmId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Farm ID is required'),
      body('providerId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Provider ID is required'),
      body('type')
        .isString()
        .custom((value) => {
          if (!validatePolicyType(value)) {
            throw new Error(`Invalid policy type. Must be one of: ${Object.values(PolicyType).join(', ')}`);
          }
          return true;
        }),
      body('coverages')
        .isArray({ min: 1 })
        .withMessage('At least one coverage is required'),
      body('coverages.*.type')
        .isString()
        .withMessage('Coverage type is required'),
      body('coverages.*.limit')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Coverage limit must be a positive number'),
      body('coverages.*.deductible')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Deductible must be a positive number'),
      body('coverages.*.premium')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Premium must be a positive number'),
      body('totalPremium')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Total premium must be a positive number'),
      body('totalCoverage')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Total coverage must be a positive number'),
      body('effectiveDate')
        .isISO8601()
        .withMessage('Effective date must be a valid ISO 8601 date'),
      body('expirationDate')
        .isISO8601()
        .withMessage('Expiration date must be a valid ISO 8601 date')
        .custom((expirationDate, { req }) => {
          const effectiveDate = new Date(req.body.effectiveDate);
          const expDate = new Date(expirationDate);
          if (expDate <= effectiveDate) {
            throw new Error('Expiration date must be after effective date');
          }
          return true;
        })
    ];
  }

  static validateUpdatePolicyStatus() {
    return [
      param('policyId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Policy ID is required'),
      body('status')
        .isString()
        .isIn(Object.values(PolicyStatus))
        .withMessage(`Status must be one of: ${Object.values(PolicyStatus).join(', ')}`)
    ];
  }

  // Claim validations
  static validateCreateClaim() {
    return [
      body('policyId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Policy ID is required'),
      body('userId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('User ID is required'),
      body('farmId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Farm ID is required'),
      body('incidentDate')
        .isISO8601()
        .withMessage('Incident date must be a valid ISO 8601 date')
        .custom((incidentDate) => {
          const incident = new Date(incidentDate);
          const now = new Date();
          if (incident > now) {
            throw new Error('Incident date cannot be in the future');
          }
          // Claims should be reported within reasonable time (e.g., 1 year)
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (incident < oneYearAgo) {
            throw new Error('Incident date is too far in the past (more than 1 year)');
          }
          return true;
        }),
      body('description')
        .isString()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Description must be between 10 and 2000 characters'),
      body('estimatedLoss')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Estimated loss must be a positive number')
    ];
  }

  static validateUpdateClaimStatus() {
    return [
      param('claimId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Claim ID is required'),
      body('status')
        .isString()
        .custom((value) => {
          if (!validateClaimStatus(value)) {
            throw new Error(`Invalid claim status. Must be one of: ${Object.values(ClaimStatus).join(', ')}`);
          }
          return true;
        }),
      body('approvedAmount')
        .optional()
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Approved amount must be a positive number'),
      body('note')
        .optional()
        .isString()
        .isLength({ max: 1000 })
        .withMessage('Note must be less than 1000 characters')
    ];
  }

  static validateAddClaimEvidence() {
    return [
      param('claimId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Claim ID is required'),
      body('type')
        .isString()
        .isIn(['photo', 'document', 'video', 'report'])
        .withMessage('Evidence type must be one of: photo, document, video, report'),
      body('name')
        .isString()
        .isLength({ min: 1, max: 200 })
        .withMessage('Evidence name must be between 1 and 200 characters'),
      body('url')
        .isString()
        .isURL()
        .withMessage('Evidence URL must be a valid URL'),
      body('description')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Description must be less than 500 characters')
    ];
  }

  // Quote validations
  static validateQuoteRequest() {
    return [
      body('userId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('User ID is required'),
      body('farmId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Farm ID is required'),
      body('type')
        .isString()
        .custom((value) => {
          if (!validatePolicyType(value)) {
            throw new Error(`Invalid policy type. Must be one of: ${Object.values(PolicyType).join(', ')}`);
          }
          return true;
        }),
      body('coverageAmount')
        .isNumeric()
        .isFloat({ min: 1000 })
        .withMessage('Coverage amount must be at least $1,000'),
      body('deductible')
        .isNumeric()
        .isFloat({ min: 0 })
        .withMessage('Deductible must be a positive number'),
      body('farmDetails.acreage')
        .isNumeric()
        .isFloat({ min: 0.1 })
        .withMessage('Acreage must be greater than 0.1'),
      body('farmDetails.location.state')
        .isString()
        .isLength({ min: 2, max: 2 })
        .withMessage('State must be a 2-letter abbreviation'),
      body('farmDetails.location.zipCode')
        .isString()
        .matches(/^\d{5}(-\d{4})?$/)
        .withMessage('ZIP code must be in format 12345 or 12345-6789'),
      body('farmDetails.cropTypes')
        .isArray({ min: 1 })
        .withMessage('At least one crop type is required')
    ];
  }

  // Risk assessment validations
  static validateRiskAssessment() {
    return [
      body('userId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('User ID is required'),
      body('farmId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Farm ID is required'),
      body('assessorId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Assessor ID is required'),
      body('riskFactors')
        .isArray({ min: 1 })
        .withMessage('At least one risk factor is required'),
      body('riskFactors.*.category')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Risk factor category is required'),
      body('riskFactors.*.factor')
        .isString()
        .isLength({ min: 1 })
        .withMessage('Risk factor name is required'),
      body('riskFactors.*.level')
        .isString()
        .custom((value) => {
          if (!validateRiskLevel(value)) {
            throw new Error(`Invalid risk level. Must be one of: ${Object.values(RiskLevel).join(', ')}`);
          }
          return true;
        }),
      body('riskFactors.*.score')
        .isNumeric()
        .isInt({ min: 1, max: 10 })
        .withMessage('Risk score must be between 1 and 10')
    ];
  }

  // Query parameter validations
  static validatePolicyQuery() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('type')
        .optional()
        .custom((value) => {
          if (value && !validatePolicyType(value)) {
            throw new Error(`Invalid policy type. Must be one of: ${Object.values(PolicyType).join(', ')}`);
          }
          return true;
        }),
      query('status')
        .optional()
        .isIn(Object.values(PolicyStatus))
        .withMessage(`Status must be one of: ${Object.values(PolicyStatus).join(', ')}`),
      query('sortBy')
        .optional()
        .isIn(['createdAt', 'updatedAt', 'expirationDate', 'totalPremium', 'totalCoverage'])
        .withMessage('Invalid sort field'),
      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
    ];
  }

  static validateClaimQuery() {
    return [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      query('status')
        .optional()
        .custom((value) => {
          if (value && !validateClaimStatus(value)) {
            throw new Error(`Invalid claim status. Must be one of: ${Object.values(ClaimStatus).join(', ')}`);
          }
          return true;
        }),
      query('dateFrom')
        .optional()
        .isISO8601()
        .withMessage('Date from must be a valid ISO 8601 date'),
      query('dateTo')
        .optional()
        .isISO8601()
        .withMessage('Date to must be a valid ISO 8601 date'),
      query('sortBy')
        .optional()
        .isIn(['incidentDate', 'reportedDate', 'createdAt', 'updatedAt', 'estimatedLoss'])
        .withMessage('Invalid sort field'),
      query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc')
    ];
  }

  // Parameter validations
  static validateObjectId() {
    return [
      param('id')
        .isString()
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid ID format')
    ];
  }

  static validatePolicyId() {
    return [
      param('policyId')
        .isString()
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid policy ID format')
    ];
  }

  static validateClaimId() {
    return [
      param('claimId')
        .isString()
        .matches(/^[0-9a-fA-F]{24}$/)
        .withMessage('Invalid claim ID format')
    ];
  }

  static validateUserId() {
    return [
      param('userId')
        .isString()
        .isLength({ min: 1 })
        .withMessage('User ID is required')
    ];
  }

  // Custom validation helpers
  static customValidation(validator: (value: any, req: Request) => boolean | string) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = validator(req.body, req);
        if (result === true) {
          next();
        } else {
          const message = typeof result === 'string' ? result : 'Custom validation failed';
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
      } catch (error) {
        next(error);
      }
    };
  }
}