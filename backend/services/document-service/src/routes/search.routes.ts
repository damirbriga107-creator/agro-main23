import { Router, Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { validate } from '../middleware/validation.middleware';
import { query } from 'express-validator';
import { DocumentType, DocumentCategory, ProcessingStatus, OcrStatus } from '../models/document.model';

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

// Search documents
router.get(
  '/',
  validate([
    query('q')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('fileName')
      .optional()
      .isString()
      .isLength({ min: 1, max: 255 })
      .withMessage('File name must be between 1 and 255 characters'),
    query('documentType')
      .optional()
      .isIn(Object.values(DocumentType))
      .withMessage(`Document type must be one of: ${Object.values(DocumentType).join(', ')}`),
    query('category')
      .optional()
      .isIn(Object.values(DocumentCategory))
      .withMessage(`Category must be one of: ${Object.values(DocumentCategory).join(', ')}`),
    query('tags')
      .optional()
      .isString()
      .withMessage('Tags must be a comma-separated string'),
    query('processingStatus')
      .optional()
      .isIn(Object.values(ProcessingStatus))
      .withMessage(`Processing status must be one of: ${Object.values(ProcessingStatus).join(', ')}`),
    query('ocrStatus')
      .optional()
      .isIn(Object.values(OcrStatus))
      .withMessage(`OCR status must be one of: ${Object.values(OcrStatus).join(', ')}`),
    query('uploadedAfter')
      .optional()
      .isISO8601()
      .withMessage('uploadedAfter must be a valid ISO8601 date'),
    query('uploadedBefore')
      .optional()
      .isISO8601()
      .withMessage('uploadedBefore must be a valid ISO8601 date'),
    query('relatedEntityType')
      .optional()
      .isIn(['subsidy_application', 'insurance_claim', 'financial_record', 'farm_record'])
      .withMessage('relatedEntityType must be a valid entity type'),
    query('relatedEntityId')
      .optional()
      .isString()
      .withMessage('relatedEntityId must be a string'),
    query('hasExtractedText')
      .optional()
      .isBoolean()
      .withMessage('hasExtractedText must be a boolean'),
    query('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
      .optional()
      .isIn(['fileName', 'uploadedAt', 'size', 'documentType', 'category'])
      .withMessage('sortBy must be one of: fileName, uploadedAt, size, documentType, category'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sortOrder must be either asc or desc')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const farmId = req.user!.farmId;

    // Build search query
    const searchQuery: any = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'uploadedAt',
      sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
    };

    // Add filters
    if (req.query.fileName) {
      searchQuery.fileName = req.query.fileName as string;
    }
    if (req.query.documentType) {
      searchQuery.documentType = req.query.documentType as DocumentType;
    }
    if (req.query.category) {
      searchQuery.category = req.query.category as DocumentCategory;
    }
    if (req.query.tags) {
      searchQuery.tags = (req.query.tags as string).split(',').map(tag => tag.trim());
    }
    if (req.query.processingStatus) {
      searchQuery.processingStatus = req.query.processingStatus as ProcessingStatus;
    }
    if (req.query.ocrStatus) {
      searchQuery.ocrStatus = req.query.ocrStatus as OcrStatus;
    }
    if (req.query.uploadedAfter) {
      searchQuery.uploadedAfter = new Date(req.query.uploadedAfter as string);
    }
    if (req.query.uploadedBefore) {
      searchQuery.uploadedBefore = new Date(req.query.uploadedBefore as string);
    }
    if (req.query.relatedEntityType) {
      searchQuery.relatedEntityType = req.query.relatedEntityType as string;
    }
    if (req.query.relatedEntityId) {
      searchQuery.relatedEntityId = req.query.relatedEntityId as string;
    }
    if (req.query.hasExtractedText !== undefined) {
      searchQuery.hasExtractedText = req.query.hasExtractedText === 'true';
    }
    if (req.query.isPublic !== undefined) {
      searchQuery.isPublic = req.query.isPublic === 'true';
    }

    try {
      const results = await documentService.searchDocuments(searchQuery, userId, farmId);

      res.json({
        success: true,
        data: results,
        query: searchQuery
      });
    } catch (error) {
      throw error;
    }
  })
);

// Advanced search with full-text search
router.post(
  '/advanced',
  validate([
    // TODO: Add validation for advanced search body
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const farmId = req.user!.farmId;

    // TODO: Implement advanced search with full-text capabilities
    res.status(501).json({
      error: 'Not implemented',
      message: 'Advanced search functionality is not yet implemented'
    });
  })
);

// Search by content (OCR text)
router.get(
  '/content',
  validate([
    query('q')
      .isString()
      .isLength({ min: 3, max: 200 })
      .withMessage('Search query must be between 3 and 200 characters'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q: searchText } = req.query;
    const userId = req.user!.id;
    const farmId = req.user!.farmId;

    try {
      // Search in extracted text
      const searchQuery = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        hasExtractedText: true
        // TODO: Add text search functionality
      };

      const results = await documentService.searchDocuments(searchQuery, userId, farmId);

      // TODO: Implement actual text search in OCR content
      // For now, return basic search results
      res.json({
        success: true,
        data: {
          ...results,
          searchText,
          message: 'Full-text search in OCR content is not yet fully implemented'
        }
      });
    } catch (error) {
      throw error;
    }
  })
);

// Get search suggestions/autocomplete
router.get(
  '/suggestions',
  validate([
    query('q')
      .isString()
      .isLength({ min: 1, max: 50 })
      .withMessage('Query must be between 1 and 50 characters'),
    query('type')
      .optional()
      .isIn(['fileName', 'tags', 'documentType', 'category'])
      .withMessage('Type must be one of: fileName, tags, documentType, category')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { q: query, type = 'fileName' } = req.query;
    const userId = req.user!.id;
    const farmId = req.user!.farmId;

    try {
      // TODO: Implement search suggestions based on existing data
      const suggestions: string[] = [];

      switch (type) {
        case 'documentType':
          suggestions.push(...Object.values(DocumentType)
            .filter(dt => dt.toLowerCase().includes((query as string).toLowerCase())));
          break;
        case 'category':
          suggestions.push(...Object.values(DocumentCategory)
            .filter(cat => cat.toLowerCase().includes((query as string).toLowerCase())));
          break;
        case 'tags':
          // TODO: Get actual tags from database
          suggestions.push('farm-records', 'financial', 'legal', 'insurance');
          break;
        case 'fileName':
        default:
          // TODO: Get actual file name suggestions from database
          suggestions.push('document1.pdf', 'invoice.pdf', 'contract.docx');
          break;
      }

      res.json({
        success: true,
        data: {
          query,
          type,
          suggestions: suggestions.slice(0, 10), // Limit to 10 suggestions
          count: suggestions.length
        }
      });
    } catch (error) {
      throw error;
    }
  })
);

// Get recent searches
router.get(
  '/recent',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement recent searches functionality
    res.json({
      success: true,
      data: {
        recentSearches: [],
        message: 'Recent searches functionality is not yet implemented'
      }
    });
  })
);

// Save search
router.post(
  '/save',
  validate([
    // TODO: Add validation for saved search
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement saved searches functionality
    res.status(501).json({
      error: 'Not implemented',
      message: 'Saved searches functionality is not yet implemented'
    });
  })
);

// Get saved searches
router.get(
  '/saved',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement saved searches functionality
    res.json({
      success: true,
      data: {
        savedSearches: [],
        message: 'Saved searches functionality is not yet implemented'
      }
    });
  })
);

export default router;