import { Router } from 'express';
import documentRoutes from './document.routes';
import uploadRoutes from './upload.routes';
import searchRoutes from './search.routes';
import statsRoutes from './stats.routes';

const router = Router();

// Mount route modules
router.use('/documents', documentRoutes);
router.use('/upload', uploadRoutes);
router.use('/search', searchRoutes);
router.use('/stats', statsRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    service: 'DaorsAgro Document Service',
    version: '1.0.0',
    description: 'Document management, storage, and processing service',
    endpoints: {
      documents: '/api/v1/documents',
      upload: '/api/v1/upload',
      search: '/api/v1/search',
      stats: '/api/v1/stats'
    },
    features: [
      'File upload and storage',
      'OCR text extraction',
      'Document search and filtering',
      'Access control and permissions',
      'Metadata management',
      'Integration with other services'
    ]
  });
});

export default router;