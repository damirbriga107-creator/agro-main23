import { ObjectId } from 'mongodb';

export interface DocumentMetadata {
  _id?: ObjectId;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  userId: string;
  farmId: string;
  documentType: DocumentType;
  category: DocumentCategory;
  tags: string[];
  description?: string;
  
  // Storage information
  storageProvider: 'local' | 's3' | 'minio';
  storagePath: string;
  storageUrl?: string;
  checksum: string;
  
  // Processing status
  processingStatus: ProcessingStatus;
  ocrStatus: OcrStatus;
  extractedText?: string;
  ocrConfidence?: number;
  
  // Security and access
  isPublic: boolean;
  accessPermissions: AccessPermission[];
  encryptionKeyId?: string;
  
  // Relationships
  relatedEntityType?: 'subsidy_application' | 'insurance_claim' | 'financial_record' | 'farm_record';
  relatedEntityId?: string;
  
  // Audit trail
  uploadedAt: Date;
  uploadedBy: string;
  lastModifiedAt: Date;
  lastModifiedBy: string;
  version: number;
  
  // Metadata
  exifData?: any;
  thumbnailPath?: string;
  previewPath?: string;
}

export interface DocumentVersion {
  _id?: ObjectId;
  documentId: string;
  version: number;
  fileName: string;
  size: number;
  checksum: string;
  storagePath: string;
  uploadedAt: Date;
  uploadedBy: string;
  changeReason?: string;
}

export interface DocumentShare {
  _id?: ObjectId;
  documentId: string;
  sharedBy: string;
  sharedWith: string;
  permissions: SharePermission[];
  expiresAt?: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt?: Date;
}

export interface DocumentProcessingJob {
  _id?: ObjectId;
  documentId: string;
  jobType: ProcessingJobType;
  status: ProcessingJobStatus;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  result?: any;
  retryCount: number;
  maxRetries: number;
}

export enum DocumentType {
  IDENTIFICATION = 'identification',
  FINANCIAL_STATEMENT = 'financial_statement',
  INSURANCE_DOCUMENT = 'insurance_document',
  SUBSIDY_APPLICATION = 'subsidy_application',
  FARM_CERTIFICATE = 'farm_certificate',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  PHOTO = 'photo',
  REPORT = 'report',
  OTHER = 'other'
}

export enum DocumentCategory {
  LEGAL = 'legal',
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  COMPLIANCE = 'compliance',
  MARKETING = 'marketing',
  TECHNICAL = 'technical',
  PERSONAL = 'personal'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum OcrStatus {
  NOT_REQUIRED = 'not_required',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ProcessingJobType {
  OCR_EXTRACTION = 'ocr_extraction',
  THUMBNAIL_GENERATION = 'thumbnail_generation',
  PREVIEW_GENERATION = 'preview_generation',
  VIRUS_SCAN = 'virus_scan',
  CONTENT_ANALYSIS = 'content_analysis',
  AUTO_TAGGING = 'auto_tagging'
}

export enum ProcessingJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface AccessPermission {
  userId: string;
  role: string;
  permissions: Permission[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  DOWNLOAD = 'download'
}

export enum SharePermission {
  VIEW = 'view',
  DOWNLOAD = 'download',
  COMMENT = 'comment'
}

// Request/Response interfaces
export interface UploadDocumentRequest {
  documentType: DocumentType;
  category: DocumentCategory;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface UploadDocumentResponse {
  success: boolean;
  documentId: string;
  fileName: string;
  size: number;
  uploadUrl?: string;
  message: string;
}

export interface DocumentSearchQuery {
  fileName?: string;
  documentType?: DocumentType;
  category?: DocumentCategory;
  tags?: string[];
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  userId?: string;
  farmId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  processingStatus?: ProcessingStatus;
  ocrStatus?: OcrStatus;
  hasExtractedText?: boolean;
  isPublic?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentSearchResponse {
  documents: DocumentMetadata[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface DocumentStatsResponse {
  totalDocuments: number;
  totalSize: number;
  documentsByType: Record<DocumentType, number>;
  documentsByCategory: Record<DocumentCategory, number>;
  documentsByStatus: Record<ProcessingStatus, number>;
  recentUploads: number;
  storageUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
}