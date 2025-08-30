import { Router, Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler.middleware';
import { validate } from '../middleware/validation.middleware';
import { param, query } from 'express-validator';
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

// Get document by ID
router.get(
  '/:documentId',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    const document = await documentService.getDocument(documentId, userId);
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document was not found or you do not have access to it'
      });
    }

    res.json({
      success: true,
      data: document
    });
  })
);

// Download document
router.get(
  '/:documentId/download',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    try {
      const { buffer, fileName, mimeType } = await documentService.downloadDocument(documentId, userId);

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);

      res.send(buffer);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Document not found',
          message: 'The requested document was not found or you do not have access to it'
        });
      }
      throw error;
    }
  })
);

// Get document URL (signed URL for cloud storage)
router.get(
  '/:documentId/url',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID'),
    query('expiresIn').optional().isInt({ min: 300, max: 86400 }).withMessage('Expires in must be between 300 and 86400 seconds')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const { expiresIn = 3600 } = req.query;
    const userId = req.user!.id;

    const document = await documentService.getDocument(documentId, userId);
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document was not found or you do not have access to it'
      });
    }

    // For now, return a basic download URL
    // In production, this would generate a signed URL for cloud storage
    const downloadUrl = `/api/v1/documents/${documentId}/download`;

    res.json({
      success: true,
      data: {
        url: downloadUrl,
        expiresIn: parseInt(expiresIn as string),
        expiresAt: new Date(Date.now() + parseInt(expiresIn as string) * 1000).toISOString()
      }
    });
  })
);

// Update document metadata
router.patch(
  '/:documentId',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const userId = req.user!.id;
    const updates = req.body;

    // TODO: Implement document update functionality
    res.status(501).json({
      error: 'Not implemented',
      message: 'Document update functionality is not yet implemented'
    });
  })
);

// Delete document
router.delete(
  '/:documentId',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  requireRole(['farmer', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    try {
      await documentService.deleteDocument(documentId, userId);

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Document not found',
          message: 'The requested document was not found or you do not have permission to delete it'
        });
      }
      throw error;
    }
  })
);

// Get document versions
router.get(
  '/:documentId/versions',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    // First check if user has access to the document
    const document = await documentService.getDocument(documentId, userId);
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document was not found or you do not have access to it'
      });
    }

    // TODO: Implement version history functionality
    res.json({
      success: true,
      data: {
        versions: [
          {
            version: 1,
            uploadedAt: document.uploadedAt,
            uploadedBy: document.uploadedBy,
            size: document.size,
            current: true
          }
        ]
      }
    });
  })
);

// Share document
router.post(
  '/:documentId/share',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  requireRole(['farmer', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const userId = req.user!.id;

    // TODO: Implement document sharing functionality
    res.status(501).json({
      error: 'Not implemented',
      message: 'Document sharing functionality is not yet implemented'
    });
  })
);

// Process document (trigger OCR, etc.)
router.post(
  '/:documentId/process',
  validate([
    param('documentId').isString().isLength({ min: 24, max: 24 }).withMessage('Invalid document ID')
  ]),
  requireRole(['farmer', 'advisor', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { documentId } = req.params;
    const { processType = 'ocr' } = req.body;
    const userId = req.user!.id;

    const document = await documentService.getDocument(documentId, userId);
    
    if (!document) {
      return res.status(404).json({
        error: 'Document not found',
        message: 'The requested document was not found or you do not have access to it'
      });
    }

    // TODO: Implement document processing triggers
    logger.info('Document processing requested', {
      documentId,
      processType,
      userId,
      fileName: document.fileName
    });

    res.json({
      success: true,
      message: `Document processing (${processType}) has been queued`,
      data: {
        documentId,
        processType,
        status: 'queued'
      }
    });
  })
);

export default router;