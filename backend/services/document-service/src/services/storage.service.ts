import AWS from 'aws-sdk';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@daorsagro/utils';

export interface StorageProvider {
  upload(file: Express.Multer.File, storagePath: string): Promise<string>;
  download(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
  getSignedUrl(storagePath: string, expiresIn?: number): Promise<string>;
  exists(storagePath: string): Promise<boolean>;
}

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = './uploads') {
    this.basePath = basePath;
    this.ensureDirectoryExists(basePath);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, storagePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.basePath, storagePath);
      const directory = path.dirname(fullPath);
      
      await this.ensureDirectoryExists(directory);
      await fs.writeFile(fullPath, file.buffer);
      
      logger.info('File uploaded to local storage', {
        originalName: file.originalname,
        storagePath: fullPath,
        size: file.size
      });

      return fullPath;
    } catch (error) {
      logger.error('Failed to upload file to local storage', error);
      throw new Error('Failed to upload file');
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.basePath, storagePath);
      return await fs.readFile(fullPath);
    } catch (error) {
      logger.error('Failed to download file from local storage', { storagePath, error });
      throw new Error('Failed to download file');
    }
  }

  async delete(storagePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.basePath, storagePath);
      await fs.unlink(fullPath);
      
      logger.info('File deleted from local storage', { storagePath: fullPath });
    } catch (error) {
      logger.error('Failed to delete file from local storage', { storagePath, error });
      throw new Error('Failed to delete file');
    }
  }

  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    // For local storage, we'll return a basic file URL
    // In a real implementation, you might generate a temporary token
    return `/api/v1/documents/download/${encodeURIComponent(storagePath)}`;
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, storagePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export class S3StorageProvider implements StorageProvider {
  private s3: AWS.S3;
  private bucket: string;

  constructor(bucket: string, region: string = 'us-east-1') {
    this.bucket = bucket;
    this.s3 = new AWS.S3({
      region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }

  async upload(file: Express.Multer.File, storagePath: string): Promise<string> {
    try {
      const uploadParams: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: storagePath,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await this.s3.upload(uploadParams).promise();
      
      logger.info('File uploaded to S3', {
        originalName: file.originalname,
        key: storagePath,
        bucket: this.bucket,
        location: result.Location
      });

      return result.Location;
    } catch (error) {
      logger.error('Failed to upload file to S3', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async download(storagePath: string): Promise<Buffer> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.bucket,
        Key: storagePath
      };

      const result = await this.s3.getObject(params).promise();
      return result.Body as Buffer;
    } catch (error) {
      logger.error('Failed to download file from S3', { key: storagePath, error });
      throw new Error('Failed to download file from S3');
    }
  }

  async delete(storagePath: string): Promise<void> {
    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: storagePath
      };

      await this.s3.deleteObject(params).promise();
      
      logger.info('File deleted from S3', { key: storagePath, bucket: this.bucket });
    } catch (error) {
      logger.error('Failed to delete file from S3', { key: storagePath, error });
      throw new Error('Failed to delete file from S3');
    }
  }

  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const params = {
        Bucket: this.bucket,
        Key: storagePath,
        Expires: expiresIn
      };

      return this.s3.getSignedUrl('getObject', params);
    } catch (error) {
      logger.error('Failed to generate signed URL', { key: storagePath, error });
      throw new Error('Failed to generate signed URL');
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: storagePath
      };

      await this.s3.headObject(params).promise();
      return true;
    } catch {
      return false;
    }
  }
}

export class StorageService {
  private provider: StorageProvider;
  private storageType: 'local' | 's3' | 'minio';

  constructor() {
    this.storageType = (process.env.STORAGE_TYPE as 'local' | 's3' | 'minio') || 'local';
    this.provider = this.createProvider();
  }

  private createProvider(): StorageProvider {
    switch (this.storageType) {
      case 's3':
        return new S3StorageProvider(
          process.env.S3_BUCKET || 'daorsagro-documents',
          process.env.AWS_REGION || 'us-east-1'
        );
      case 'minio':
        // MinIO uses S3-compatible API
        return new S3StorageProvider(
          process.env.MINIO_BUCKET || 'documents',
          process.env.MINIO_REGION || 'us-east-1'
        );
      case 'local':
      default:
        return new LocalStorageProvider(process.env.UPLOAD_PATH || './uploads');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    documentType: string
  ): Promise<{ storagePath: string; storageUrl: string; checksum: string }> {
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(8).toString('hex');
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}-${randomString}${fileExtension}`;
      const storagePath = `${userId}/${documentType}/${fileName}`;

      // Calculate file checksum
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

      // Upload file
      const storageUrl = await this.provider.upload(file, storagePath);

      logger.info('File uploaded successfully', {
        originalName: file.originalname,
        storagePath,
        storageUrl,
        checksum,
        size: file.size
      });

      return {
        storagePath,
        storageUrl,
        checksum
      };
    } catch (error) {
      logger.error('Failed to upload file', error);
      throw error;
    }
  }

  async downloadFile(storagePath: string): Promise<Buffer> {
    return this.provider.download(storagePath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    return this.provider.delete(storagePath);
  }

  async getFileUrl(storagePath: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUrl(storagePath, expiresIn);
  }

  async fileExists(storagePath: string): Promise<boolean> {
    return this.provider.exists(storagePath);
  }

  getStorageType(): string {
    return this.storageType;
  }

  async getStorageStats(): Promise<{
    provider: string;
    totalFiles: number;
    totalSize: number;
  }> {
    // This would need to be implemented based on the storage provider
    // For now, return basic info
    return {
      provider: this.storageType,
      totalFiles: 0,
      totalSize: 0
    };
  }
}