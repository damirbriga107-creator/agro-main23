import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions, Algorithm, StringValue } from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { isNull, isUndefined, isEmpty } from 'lodash';

import { TokenPayload, UserRole } from '@daorsagro/types';

// Export new utility modules
export * from './service-utils';
export * from './middleware';
export * from './database-connections';
export * from './logger';

/**
 * Password utility functions
 */
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password using bcrypt
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random password
   */
  static generateSecure(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

/**
 * JWT token utility functions
 */
export class TokenUtils {
  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn: string = '15m'): string {
    const opts: SignOptions = { expiresIn, algorithm: 'HS256' as Algorithm };
    return jwt.sign(payload as object, secret as Secret, opts);
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn: string = '7d'): string {
    const opts: SignOptions = { expiresIn, algorithm: 'HS256' as Algorithm };
    return jwt.sign(payload as object, secret as Secret, opts);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string, secret: string): TokenPayload {
    return jwt.verify(token, secret) as TokenPayload;
  }

  /**
   * Decode JWT token without verification
   */
  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Check if value is null, undefined, or empty
   */
  static isEmpty(value: any): boolean {
    return isNull(value) || isUndefined(value) || isEmpty(value);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate password strength
   */
  static isValidPassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate farm coordinates
   */
  static isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}

/**
 * Encryption utility functions
 */
export class EncryptionUtils {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly TAG_LENGTH = 16;

  /**
   * Encrypt sensitive data
   */
  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipher(this.ALGORITHM, key);
    cipher.setAAD(Buffer.from('daorsagro'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encryptedData: string, key: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(this.ALGORITHM, key);
    decipher.setAAD(Buffer.from('daorsagro'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Generate cryptographically secure random string
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash data using SHA-256
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Date and time utility functions
 */
export class DateUtils {
  /**
   * Get current timestamp in ISO format
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * Add days to a date
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Add months to a date
   */
  static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Get start of day
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Get end of day
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * Get start of month
   */
  static startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get end of month
   */
  static endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  /**
   * Get current farming season year
   */
  static getCurrentSeasonYear(): number {
    const now = new Date();
    const month = now.getMonth();
    // Farming season typically starts in March (month 2)
    return month >= 2 ? now.getFullYear() : now.getFullYear() - 1;
  }

  /**
   * Check if date is in the past
   */
  static isPast(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Check if date is in the future
   */
  static isFuture(date: Date): boolean {
    return date > new Date();
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
    switch (format) {
      case 'short':
        return date.toLocaleDateString();
      case 'long':
        return date.toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'iso':
        return date.toISOString();
      default:
        return date.toLocaleDateString();
    }
  }
}

/**
 * ID generation utility functions
 */
export class IdUtils {
  /**
   * Generate nanoid with custom length
   */
  static generate(length: number = 21): string {
    return nanoid(length);
  }

  /**
   * Generate UUID v4
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate short ID for user-facing references
   */
  static generateShortId(prefix?: string): string {
    const id = nanoid(8);
    return prefix ? `${prefix}-${id}` : id;
  }

  /**
   * Generate transaction reference number
   */
  static generateTransactionRef(): string {
    const timestamp = Date.now().toString(36);
    const random = nanoid(6);
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate application reference number
   */
  static generateApplicationRef(): string {
    const timestamp = Date.now().toString(36);
    const random = nanoid(6);
    return `APP-${timestamp}-${random}`.toUpperCase();
  }
}

/**
 * Number and currency utility functions
 */
export class NumberUtils {
  /**
   * Format currency amount
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Round to decimal places
   */
  static round(number: number, decimals: number = 2): number {
    return Math.round((number + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Calculate percentage change
   */
  static percentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue === 0 ? 0 : 100;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Calculate profit margin
   */
  static calculateProfitMargin(revenue: number, costs: number): number {
    if (revenue === 0) return 0;
    return ((revenue - costs) / revenue) * 100;
  }

  /**
   * Calculate compound annual growth rate (CAGR)
   */
  static calculateCAGR(beginningValue: number, endingValue: number, years: number): number {
    if (beginningValue === 0 || years === 0) return 0;
    return (Math.pow(endingValue / beginningValue, 1 / years) - 1) * 100;
  }
}

/**
 * Error handling utility functions
 */
export class ErrorUtils {
  /**
   * Create standardized error object
   */
  static createError(code: string, message: string, details?: any): Error & { code: string; details?: any } {
    const error = new Error(message) as Error & { code: string; details?: any };
    error.code = code;
    error.details = details;
    return error;
  }

  /**
   * Check if error is operational (expected) error
   */
  static isOperationalError(error: any): boolean {
    return error?.isOperational === true;
  }

  /**
   * Sanitize error for client response
   */
  static sanitizeError(error: any): { code: string; message: string; details?: any } {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      ...(isDevelopment && error.details && { details: error.details })
    };
  }
}

/**
 * Array utility functions
 */
export class ArrayUtils {
  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Remove duplicates from array
   */
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Get random item from array
   */
  static randomItem<T>(array: T[]): T | undefined {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Shuffle array randomly
   */
  static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * String utility functions
 */
export class StringUtils {
  /**
   * Convert string to slug
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(text: string, length: number, suffix: string = '...'): string {
    if (text.length <= length) return text;
    return text.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Capitalize first letter
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Convert to title case
   */
  static titleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Mask sensitive information
   */
  static mask(text: string, visibleChars: number = 4, maskChar: string = '*'): string {
    if (text.length <= visibleChars) return text;
    const visible = text.slice(-visibleChars);
    const masked = maskChar.repeat(text.length - visibleChars);
    return masked + visible;
  }
}

/**
 * URL utility functions
 */
export class UrlUtils {
  /**
   * Build URL with query parameters
   */
  static buildUrl(baseUrl: string, path: string, params?: Record<string, any>): string {
    const url = new URL(path, baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * Parse query parameters from URL
   */
  static parseQuery(url: string): Record<string, string> {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  }
}

/**
 * File utility functions
 */
export class FileUtils {
  /**
   * Get file extension
   */
  static getExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Check if file type is allowed
   */
  static isAllowedFileType(filename: string, allowedTypes: string[]): boolean {
    const extension = this.getExtension(filename).toLowerCase();
    return allowedTypes.includes(extension);
  }

  /**
   * Generate unique filename
   */
  static generateUniqueFilename(originalName: string): string {
    const extension = this.getExtension(originalName);
    const name = originalName.replace(`.${extension}`, '');
    const timestamp = Date.now();
    const random = nanoid(8);
    return `${StringUtils.slugify(name)}-${timestamp}-${random}.${extension}`;
  }
}