import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { logger } from '@daorsagro/utils';
import { StorageService } from './storage.service';
import { OcrService } from './ocr.service';
import { KafkaService } from './kafka.service';
import {
  DocumentMetadata,
  DocumentVersion,
  DocumentSearchQuery,
  DocumentSearchResponse,
  DocumentStatsResponse,
  UploadDocumentRequest,
  UploadDocumentResponse,
  ProcessingStatus,
  OcrStatus,
  DocumentType,
  DocumentCategory
} from '../models/document.model';

export class DocumentService {
  private client: MongoClient;
  private db: Db;
  private documentsCollection: Collection<DocumentMetadata>;
  private versionsCollection: Collection<DocumentVersion>;
  private storageService: StorageService;
  private ocrService: OcrService;
  private kafkaService: KafkaService;
  private isInitialized: boolean = false;

  constructor() {
    this.storageService = new StorageService();
    this.ocrService = new OcrService();
    this.kafkaService = new KafkaService();
  }

  async initialize(): Promise<void> {
    try {
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
      const dbName = process.env.MONGODB_DB || 'daorsagro_documents';

      this.client = new MongoClient(mongoUrl);
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.documentsCollection = this.db.collection<DocumentMetadata>('documents');
      this.versionsCollection = this.db.collection<DocumentVersion>('document_versions');

      // Create indexes
      await this.createIndexes();

      this.isInitialized = true;
      logger.info('Document service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize document service', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    await Promise.all([
      // Core search indexes
      this.documentsCollection.createIndex({ userId: 1, farmId: 1 }),
      this.documentsCollection.createIndex({ documentType: 1 }),
      this.documentsCollection.createIndex({ category: 1 }),
      this.documentsCollection.createIndex({ uploadedAt: -1 }),
      this.documentsCollection.createIndex({ fileName: 'text', description: 'text', extractedText: 'text' }),
      this.documentsCollection.createIndex({ tags: 1 }),
      this.documentsCollection.createIndex({ processingStatus: 1 }),
      this.documentsCollection.createIndex({ checksum: 1 }),
      
      // Relationship indexes
      this.documentsCollection.createIndex({ relatedEntityType: 1, relatedEntityId: 1 }),
      
      // Version control
      this.versionsCollection.createIndex({ documentId: 1, version: -1 })
    ]);
  }

  async uploadDocument(
    file: Express.Multer.File,
    request: UploadDocumentRequest,
    userId: string,
    farmId: string
  ): Promise<UploadDocumentResponse> {
    try {
      // Upload file to storage
      const { storagePath, storageUrl, checksum } = await this.storageService.uploadFile(
        file,
        userId,
        request.documentType
      );

      // Create document metadata
      const documentMetadata: DocumentMetadata = {
        fileName: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        userId,
        farmId,
        documentType: request.documentType,
        category: request.category,
        tags: request.tags || [],
        description: request.description,
        
        storageProvider: this.storageService.getStorageType() as any,
        storagePath,
        storageUrl,
        checksum,
        
        processingStatus: ProcessingStatus.PENDING,
        ocrStatus: this.shouldProcessOcr(file.mimetype) ? OcrStatus.PENDING : OcrStatus.NOT_REQUIRED,
        
        isPublic: request.isPublic || false,
        accessPermissions: [],
        
        relatedEntityType: request.relatedEntityType as any,
        relatedEntityId: request.relatedEntityId,
        
        uploadedAt: new Date(),
        uploadedBy: userId,
        lastModifiedAt: new Date(),
        lastModifiedBy: userId,
        version: 1
      };

      // Save to database
      const result = await this.documentsCollection.insertOne(documentMetadata);
      const documentId = result.insertedId.toString();

      // Queue processing jobs
      await this.queueProcessingJobs(documentId, file.mimetype);

      // Publish event
      await this.kafkaService.publishEvent('document.uploaded', {
        documentId,
        userId,
        farmId,
        fileName: file.originalname,
        documentType: request.documentType,
        size: file.size
      });

      logger.info('Document uploaded successfully', {
        documentId,
        userId,
        fileName: file.originalname,
        size: file.size
      });

      return {
        success: true,
        documentId,
        fileName: file.originalname,
        size: file.size,
        uploadUrl: storageUrl,
        message: 'Document uploaded successfully'
      };
    } catch (error) {
      logger.error('Failed to upload document', error);
      throw error;
    }
  }

  async getDocument(documentId: string, userId: string): Promise<DocumentMetadata | null> {
    try {
      const document = await this.documentsCollection.findOne({
        _id: new ObjectId(documentId),
        $or: [
          { userId },
          { isPublic: true },
          { 'accessPermissions.userId': userId }
        ]
      });

      return document;
    } catch (error) {
      logger.error('Failed to get document', { documentId, error });
      throw error;
    }
  }

  async downloadDocument(documentId: string, userId: string): Promise<{
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    try {
      const document = await this.getDocument(documentId, userId);
      if (!document) {
        throw new Error('Document not found or access denied');
      }

      const buffer = await this.storageService.downloadFile(document.storagePath);

      logger.info('Document downloaded', {
        documentId,
        userId,
        fileName: document.fileName
      });

      return {
        buffer,
        fileName: document.fileName,
        mimeType: document.mimeType
      };
    } catch (error) {
      logger.error('Failed to download document', { documentId, error });
      throw error;
    }
  }

  async searchDocuments(
    query: DocumentSearchQuery,
    userId: string,
    farmId: string
  ): Promise<DocumentSearchResponse> {
    try {
      const filter: any = {
        $or: [
          { userId },
          { farmId },
          { isPublic: true },
          { 'accessPermissions.userId': userId }
        ]
      };

      // Add search filters
      if (query.fileName) {
        filter.fileName = { $regex: query.fileName, $options: 'i' };
      }
      if (query.documentType) {
        filter.documentType = query.documentType;
      }
      if (query.category) {
        filter.category = query.category;
      }
      if (query.tags && query.tags.length > 0) {
        filter.tags = { $in: query.tags };
      }
      if (query.processingStatus) {
        filter.processingStatus = query.processingStatus;
      }
      if (query.ocrStatus) {
        filter.ocrStatus = query.ocrStatus;
      }
      if (query.relatedEntityType) {
        filter.relatedEntityType = query.relatedEntityType;
      }
      if (query.relatedEntityId) {
        filter.relatedEntityId = query.relatedEntityId;
      }

      // Date range filters
      if (query.uploadedAfter || query.uploadedBefore) {
        filter.uploadedAt = {};
        if (query.uploadedAfter) {
          filter.uploadedAt.$gte = query.uploadedAfter;
        }
        if (query.uploadedBefore) {
          filter.uploadedAt.$lte = query.uploadedBefore;
        }
      }

      // Pagination
      const page = query.page || 1;
      const limit = Math.min(query.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Sorting
      const sortField = query.sortBy || 'uploadedAt';
      const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
      const sort = { [sortField]: sortOrder };

      // Execute query
      const [documents, totalCount] = await Promise.all([
        this.documentsCollection
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .toArray(),
        this.documentsCollection.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        documents,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error) {
      logger.error('Failed to search documents', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.documentsCollection.findOne({
        _id: new ObjectId(documentId),
        userId // Only allow deletion by owner
      });

      if (!document) {
        throw new Error('Document not found or access denied');
      }

      // Delete from storage
      await this.storageService.deleteFile(document.storagePath);

      // Delete from database
      await this.documentsCollection.deleteOne({ _id: new ObjectId(documentId) });

      // Delete versions
      await this.versionsCollection.deleteMany({ documentId });

      // Publish event
      await this.kafkaService.publishEvent('document.deleted', {
        documentId,
        userId,
        fileName: document.fileName
      });

      logger.info('Document deleted successfully', {
        documentId,
        userId,
        fileName: document.fileName
      });
    } catch (error) {
      logger.error('Failed to delete document', { documentId, error });
      throw error;
    }
  }

  async getDocumentStats(userId: string, farmId: string): Promise<DocumentStatsResponse> {
    try {
      const pipeline = [
        {
          $match: {
            $or: [{ userId }, { farmId }]
          }
        },
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalSize: { $sum: '$size' },
            documentsByType: {
              $push: {
                type: '$documentType',
                count: 1
              }
            },
            documentsByCategory: {
              $push: {
                category: '$category',
                count: 1
              }
            },
            documentsByStatus: {
              $push: {
                status: '$processingStatus',
                count: 1
              }
            }
          }
        }
      ];

      const [stats] = await this.documentsCollection.aggregate(pipeline).toArray();

      // Count recent uploads (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentUploads = await this.documentsCollection.countDocuments({
        $or: [{ userId }, { farmId }],
        uploadedAt: { $gte: weekAgo }
      });

      return {
        totalDocuments: stats?.totalDocuments || 0,
        totalSize: stats?.totalSize || 0,
        documentsByType: this.aggregateByField(stats?.documentsByType, Object.values(DocumentType)),
        documentsByCategory: this.aggregateByField(stats?.documentsByCategory, Object.values(DocumentCategory)),
        documentsByStatus: this.aggregateByField(stats?.documentsByStatus, Object.values(ProcessingStatus)),
        recentUploads,
        storageUsage: {
          used: stats?.totalSize || 0,
          limit: 1024 * 1024 * 1024 * 10, // 10GB default limit
          percentage: ((stats?.totalSize || 0) / (1024 * 1024 * 1024 * 10)) * 100
        }
      };
    } catch (error) {
      logger.error('Failed to get document stats', error);
      throw error;
    }
  }

  private aggregateByField(items: any[], allValues: string[]): Record<string, number> {
    const result: Record<string, number> = {};
    allValues.forEach(value => {
      result[value] = 0;
    });

    if (items) {
      items.forEach(item => {
        if (result.hasOwnProperty(item.type || item.category || item.status)) {
          result[item.type || item.category || item.status]++;
        }
      });
    }

    return result;
  }

  private shouldProcessOcr(mimeType: string): boolean {
    const ocrTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/tiff'
    ];
    return ocrTypes.includes(mimeType);
  }

  private async queueProcessingJobs(documentId: string, mimeType: string): Promise<void> {
    // Queue OCR processing if needed
    if (this.shouldProcessOcr(mimeType)) {
      await this.ocrService.queueOcrJob(documentId);
    }

    // Queue thumbnail generation for images and PDFs
    if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
      // Implement thumbnail generation queue
    }
  }

  async updateDocumentProcessingStatus(
    documentId: string,
    status: ProcessingStatus,
    ocrStatus?: OcrStatus,
    extractedText?: string,
    ocrConfidence?: number
  ): Promise<void> {
    try {
      const updateDoc: any = {
        processingStatus: status,
        lastModifiedAt: new Date()
      };

      if (ocrStatus !== undefined) {
        updateDoc.ocrStatus = ocrStatus;
      }
      if (extractedText !== undefined) {
        updateDoc.extractedText = extractedText;
      }
      if (ocrConfidence !== undefined) {
        updateDoc.ocrConfidence = ocrConfidence;
      }

      await this.documentsCollection.updateOne(
        { _id: new ObjectId(documentId) },
        { $set: updateDoc }
      );

      logger.info('Document processing status updated', {
        documentId,
        status,
        ocrStatus
      });
    } catch (error) {
      logger.error('Failed to update document processing status', { documentId, error });
      throw error;
    }
  }
}