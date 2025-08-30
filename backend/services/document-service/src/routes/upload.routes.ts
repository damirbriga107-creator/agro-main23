import { Router, Request, Response } from 'express';
import multer from 'multer';
import { DocumentService } from '../services/document.service';
import { requireRole } from '../middleware/auth.middleware';
import { validateFileUpload, validate } from '../middleware/validation.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { body } from 'express-validator';
import { DocumentType, DocumentCategory } from '../models/document.model';
import { logger } from '@daorsagro/utils';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    farmId: string;
  };
}

const router = Router();
const documentService = new DocumentService();

// Initialize service
documentService.initialize();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // File type validation is handled in validateFileUpload middleware
    cb(null, true);
  }
});

// Single file upload
router.post(
  '/single',
  upload.single('file'),
  validateFileUpload,
  validate([
    body('documentType')
      .isIn(Object.values(DocumentType))
      .withMessage(`Document type must be one of: ${Object.values(DocumentType).join(', ')}`),
    body('category')
      .isIn(Object.values(DocumentCategory))
      .withMessage(`Category must be one of: ${Object.values(DocumentCategory).join(', ')}`),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be a string with maximum 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Each tag must be a string between 1 and 50 characters'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    body('relatedEntityType')
      .optional()
      .isIn(['subsidy_application', 'insurance_claim', 'financial_record', 'farm_record'])
      .withMessage('relatedEntityType must be a valid entity type'),
    body('relatedEntityId')
      .optional()
      .isString()
      .withMessage('relatedEntityId must be a string')
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        message: 'Please select a file to upload'
      });
    }

    const userId = req.user!.id;
    const farmId = req.user!.farmId;

    try {
      const uploadRequest = {
        documentType: req.body.documentType as DocumentType,
        category: req.body.category as DocumentCategory,
        description: req.body.description,
        tags: req.body.tags,
        isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
        relatedEntityType: req.body.relatedEntityType,
        relatedEntityId: req.body.relatedEntityId
      };

      const result = await documentService.uploadDocument(
        req.file,
        uploadRequest,
        userId,
        farmId
      );

      logger.info('Document uploaded successfully', {
        documentId: result.documentId,
        userId,
        fileName: req.file.originalname,
        size: req.file.size
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Document upload failed', {
        userId,
        fileName: req.file.originalname,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof Error && error.message.includes('storage')) {
        return res.status(507).json({
          error: 'Storage error',
          message: 'Failed to store the uploaded file'
        });
      }

      throw error;
    }
  })
);

// Multiple file upload
router.post(
  '/multiple',
  upload.array('files', 5),
  validateFileUpload,
  validate([
    body('documentType')
      .isIn(Object.values(DocumentType))
      .withMessage(`Document type must be one of: ${Object.values(DocumentType).join(', ')}`),
    body('category')
      .isIn(Object.values(DocumentCategory))
      .withMessage(`Category must be one of: ${Object.values(DocumentCategory).join(', ')}`),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be a string with maximum 1000 characters'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    body('relatedEntityType')
      .optional()
      .isIn(['subsidy_application', 'insurance_claim', 'financial_record', 'farm_record'])
      .withMessage('relatedEntityType must be a valid entity type'),
    body('relatedEntityId')
      .optional()
      .isString()
      .withMessage('relatedEntityId must be a string')
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'No files provided',
        message: 'Please select at least one file to upload'
      });
    }

    const userId = req.user!.id;
    const farmId = req.user!.farmId;

    try {
      const uploadRequest = {
        documentType: req.body.documentType as DocumentType,
        category: req.body.category as DocumentCategory,
        description: req.body.description,
        tags: req.body.tags,
        isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
        relatedEntityType: req.body.relatedEntityType,
        relatedEntityId: req.body.relatedEntityId
      };

      const results = [];
      const errors = [];

      // Process each file
      for (const file of files) {
        try {
          const result = await documentService.uploadDocument(
            file,
            uploadRequest,
            userId,
            farmId
          );
          results.push(result);

          logger.info('Document uploaded in batch', {
            documentId: result.documentId,
            userId,
            fileName: file.originalname,
            size: file.size
          });
        } catch (error) {
          logger.error('Failed to upload file in batch', {
            fileName: file.originalname,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          errors.push({
            fileName: file.originalname,
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      }

      const response: any = {
        success: results.length > 0,
        data: {
          uploaded: results,
          failed: errors,
          summary: {
            total: files.length,
            successful: results.length,
            failed: errors.length
          }
        }
      };

      if (errors.length > 0) {
        response.message = `${results.length} files uploaded successfully, ${errors.length} failed`;
      } else {
        response.message = `All ${results.length} files uploaded successfully`;
      }

      const statusCode = results.length > 0 ? 201 : 400;
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Batch upload failed', error);
      throw error;
    }
  })
);

// Upload from URL
router.post(
  '/from-url',
  validate([
    body('url')
      .isURL()
      .withMessage('Must provide a valid URL'),
    body('documentType')
      .isIn(Object.values(DocumentType))
      .withMessage(`Document type must be one of: ${Object.values(DocumentType).join(', ')}`),
    body('category')
      .isIn(Object.values(DocumentCategory))
      .withMessage(`Category must be one of: ${Object.values(DocumentCategory).join(', ')}`),
    body('fileName')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('File name must be between 1 and 255 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage('Description must be a string with maximum 1000 characters')
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // TODO: Implement URL-based upload
    res.status(501).json({
      error: 'Not implemented',
      message: 'URL-based upload functionality is not yet implemented'
    });
  })
);

// Get upload progress (for large files)
router.get(
  '/progress/:uploadId',
  validate([
    body('uploadId')
      .isString()
      .withMessage('Upload ID must be a string')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uploadId } = req.params;
    
    // TODO: Implement upload progress tracking
    res.json({
      success: true,
      data: {
        uploadId,
        progress: 100,
        status: 'completed',
        message: 'Upload progress tracking not yet implemented'
      }
    });
  })
);

// Cancel upload
router.delete(
  '/cancel/:uploadId',
  validate([
    body('uploadId')
      .isString()
      .withMessage('Upload ID must be a string')
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { uploadId } = req.params;
    
    // TODO: Implement upload cancellation
    res.json({
      success: true,
      message: 'Upload cancellation not yet implemented'
    });
  })
);

export default router;