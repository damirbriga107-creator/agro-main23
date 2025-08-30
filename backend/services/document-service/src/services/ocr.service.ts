import Tesseract from 'tesseract.js';
import { PDFExtract } from 'pdf.js-extract';
import { logger } from '@daorsagro/utils';
import { ProcessingJobType, ProcessingJobStatus, OcrStatus } from '../models/document.model';

interface OcrResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>;
}

export class OcrService {
  private isInitialized: boolean = false;
  private pdfExtract: PDFExtract;

  constructor() {
    this.pdfExtract = new PDFExtract();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize Tesseract worker
      this.isInitialized = true;
      logger.info('OCR service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OCR service', error);
      throw error;
    }
  }

  async processDocument(
    filePath: string,
    mimeType: string,
    documentId: string
  ): Promise<OcrResult> {
    try {
      logger.info('Starting OCR processing', { documentId, mimeType });

      let result: OcrResult;

      if (mimeType === 'application/pdf') {
        result = await this.processPdf(filePath);
      } else if (mimeType.startsWith('image/')) {
        result = await this.processImage(filePath);
      } else {
        throw new Error(`Unsupported file type for OCR: ${mimeType}`);
      }

      logger.info('OCR processing completed', {
        documentId,
        textLength: result.text.length,
        confidence: result.confidence,
        wordCount: result.words.length
      });

      return result;
    } catch (error) {
      logger.error('OCR processing failed', { documentId, error });
      throw error;
    }
  }

  private async processImage(filePath: string): Promise<OcrResult> {
    try {
      const worker = await Tesseract.createWorker('eng');
      
      const { data } = await worker.recognize(filePath);
      
      const result: OcrResult = {
        text: data.text.trim(),
        confidence: data.confidence,
        words: data.words.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: word.bbox
        }))
      };

      await worker.terminate();
      return result;
    } catch (error) {
      logger.error('Image OCR processing failed', error);
      throw error;
    }
  }

  private async processPdf(filePath: string): Promise<OcrResult> {
    try {
      return new Promise((resolve, reject) => {
        this.pdfExtract.extract(filePath, {}, (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          let extractedText = '';
          const words: any[] = [];

          if (data?.pages) {
            data.pages.forEach(page => {
              if (page.content) {
                page.content.forEach(item => {
                  if (item.str) {
                    extractedText += item.str + ' ';
                    words.push({
                      text: item.str,
                      confidence: 90, // PDF text extraction is generally reliable
                      bbox: {
                        x0: item.x,
                        y0: item.y,
                        x1: item.x + item.width,
                        y1: item.y + item.height
                      }
                    });
                  }
                });
                extractedText += '\n';
              }
            });
          }

          const result: OcrResult = {
            text: extractedText.trim(),
            confidence: words.length > 0 ? 90 : 0,
            words
          };

          resolve(result);
        });
      });
    } catch (error) {
      logger.error('PDF OCR processing failed', error);
      throw error;
    }
  }

  async queueOcrJob(documentId: string): Promise<void> {
    try {
      // In a real implementation, this would queue the job in a job queue
      // For now, we'll just log the intent
      logger.info('OCR job queued', { documentId });
      
      // TODO: Implement actual job queue (Redis Bull, AWS SQS, etc.)
      // For now, we'll process immediately in the background
      setImmediate(() => {
        this.processDocumentById(documentId).catch(error => {
          logger.error('Background OCR processing failed', { documentId, error });
        });
      });
    } catch (error) {
      logger.error('Failed to queue OCR job', { documentId, error });
      throw error;
    }
  }

  private async processDocumentById(documentId: string): Promise<void> {
    try {
      // This would typically:
      // 1. Fetch document metadata from database
      // 2. Download file from storage
      // 3. Process with OCR
      // 4. Update document with extracted text
      // 5. Clean up temporary files

      logger.info('Processing document OCR', { documentId });
      
      // TODO: Implement full processing pipeline
      // For now, this is a placeholder
    } catch (error) {
      logger.error('Document OCR processing failed', { documentId, error });
      throw error;
    }
  }

  async extractKeywords(text: string): Promise<string[]> {
    try {
      // Simple keyword extraction
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !this.isStopWord(word));

      // Count word frequency
      const wordCount: Record<string, number> = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });

      // Sort by frequency and return top keywords
      const keywords = Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);

      return keywords;
    } catch (error) {
      logger.error('Keyword extraction failed', error);
      return [];
    }
  }

  private isStopWord(word: string): boolean {
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'shall'
    ];
    return stopWords.includes(word);
  }

  async analyzeDocumentContent(text: string): Promise<{
    documentType: string;
    category: string;
    keywords: string[];
    entities: string[];
    summary: string;
  }> {
    try {
      const keywords = await this.extractKeywords(text);
      
      // Simple content analysis based on keywords
      const documentType = this.inferDocumentType(text, keywords);
      const category = this.inferCategory(text, keywords);
      const entities = this.extractEntities(text);
      const summary = this.generateSummary(text);

      return {
        documentType,
        category,
        keywords,
        entities,
        summary
      };
    } catch (error) {
      logger.error('Document content analysis failed', error);
      throw error;
    }
  }

  private inferDocumentType(text: string, keywords: string[]): string {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('invoice') || textLower.includes('bill') || textLower.includes('payment')) {
      return 'invoice';
    }
    if (textLower.includes('contract') || textLower.includes('agreement')) {
      return 'contract';
    }
    if (textLower.includes('subsidy') || textLower.includes('grant') || textLower.includes('application')) {
      return 'subsidy_application';
    }
    if (textLower.includes('insurance') || textLower.includes('policy') || textLower.includes('claim')) {
      return 'insurance_document';
    }
    if (textLower.includes('certificate') || textLower.includes('license')) {
      return 'farm_certificate';
    }
    
    return 'other';
  }

  private inferCategory(text: string, keywords: string[]): string {
    const textLower = text.toLowerCase();
    
    if (textLower.includes('financial') || textLower.includes('money') || textLower.includes('cost')) {
      return 'financial';
    }
    if (textLower.includes('legal') || textLower.includes('law') || textLower.includes('compliance')) {
      return 'legal';
    }
    if (textLower.includes('operation') || textLower.includes('production') || textLower.includes('harvest')) {
      return 'operational';
    }
    
    return 'other';
  }

  private extractEntities(text: string): string[] {
    // Simple entity extraction - in production, use NLP libraries
    const entities: string[] = [];
    
    // Extract potential farm names, company names, etc.
    const matches = text.match(/[A-Z][a-z]+ [A-Z][a-z]+/g);
    if (matches) {
      entities.push(...matches.slice(0, 5)); // Limit to 5 entities
    }
    
    return entities;
  }

  private generateSummary(text: string): string {
    // Simple summary generation - take first few sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    return sentences.slice(0, 2).join('. ').trim() + '.';
  }
}