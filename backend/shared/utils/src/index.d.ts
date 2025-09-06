import { TokenPayload } from '@daorsagro/types';
export * from './service-utils';
export * from './middleware';
export * from './database-connections';
export * from './logger';
/**
 * Password utility functions
 */
export declare class PasswordUtils {
    private static readonly SALT_ROUNDS;
    /**
     * Hash a password using bcrypt
     */
    static hash(password: string): Promise<string>;
    /**
     * Compare a password with its hash
     */
    static compare(password: string, hash: string): Promise<boolean>;
    /**
     * Generate a secure random password
     */
    static generateSecure(length?: number): string;
}
/**
 * JWT token utility functions
 */
export declare class TokenUtils {
    /**
     * Generate JWT access token
     */
    static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn?: string | number): string;
    /**
     * Generate JWT refresh token
     */
    static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn?: string | number): string;
    /**
     * Verify JWT token
     */
    static verifyToken(token: string, secret: string): TokenPayload;
    /**
     * Decode JWT token without verification
     */
    static decodeToken(token: string): TokenPayload | null;
    /**
     * Check if token is expired
     */
    static isTokenExpired(token: string): boolean;
}
/**
 * Validation utility functions
 */
export declare class ValidationUtils {
    /**
     * Check if value is null, undefined, or empty
     */
    static isEmpty(value: any): boolean;
    /**
     * Validate email format
     */
    static isValidEmail(email: string): boolean;
    /**
     * Validate phone number format
     */
    static isValidPhone(phone: string): boolean;
    /**
     * Validate UUID format
     */
    static isValidUUID(uuid: string): boolean;
    /**
     * Validate password strength
     */
    static isValidPassword(password: string): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Sanitize string input
     */
    static sanitizeString(input: string): string;
    /**
     * Validate farm coordinates
     */
    static isValidCoordinates(lat: number, lng: number): boolean;
}
/**
 * Encryption utility functions
 */
export declare class EncryptionUtils {
    private static readonly ALGORITHM;
    private static readonly IV_LENGTH;
    private static readonly TAG_LENGTH;
    /**
     * Encrypt sensitive data
     */
    static encrypt(text: string, key: string): string;
    /**
     * Decrypt sensitive data
     */
    static decrypt(encryptedData: string, key: string): string;
    /**
     * Generate cryptographically secure random string
     */
    static generateSecureToken(length?: number): string;
    /**
     * Hash data using SHA-256
     */
    static hash(data: string): string;
}
/**
 * Date and time utility functions
 */
export declare class DateUtils {
    /**
     * Get current timestamp in ISO format
     */
    static now(): string;
    /**
     * Add days to a date
     */
    static addDays(date: Date, days: number): Date;
    /**
     * Add months to a date
     */
    static addMonths(date: Date, months: number): Date;
    /**
     * Get start of day
     */
    static startOfDay(date: Date): Date;
    /**
     * Get end of day
     */
    static endOfDay(date: Date): Date;
    /**
     * Get start of month
     */
    static startOfMonth(date: Date): Date;
    /**
     * Get end of month
     */
    static endOfMonth(date: Date): Date;
    /**
     * Get current farming season year
     */
    static getCurrentSeasonYear(): number;
    /**
     * Check if date is in the past
     */
    static isPast(date: Date): boolean;
    /**
     * Check if date is in the future
     */
    static isFuture(date: Date): boolean;
    /**
     * Format date for display
     */
    static formatDate(date: Date, format?: 'short' | 'long' | 'iso'): string;
}
/**
 * ID generation utility functions
 */
export declare class IdUtils {
    /**
     * Generate nanoid with custom length
     */
    static generate(length?: number): string;
    /**
     * Generate UUID v4
     */
    static generateUUID(): string;
    /**
     * Generate short ID for user-facing references
     */
    static generateShortId(prefix?: string): string;
    /**
     * Generate transaction reference number
     */
    static generateTransactionRef(): string;
    /**
     * Generate application reference number
     */
    static generateApplicationRef(): string;
}
/**
 * Number and currency utility functions
 */
export declare class NumberUtils {
    /**
     * Format currency amount
     */
    static formatCurrency(amount: number, currency?: string): string;
    /**
     * Format percentage
     */
    static formatPercentage(value: number, decimals?: number): string;
    /**
     * Round to decimal places
     */
    static round(number: number, decimals?: number): number;
    /**
     * Calculate percentage change
     */
    static percentageChange(oldValue: number, newValue: number): number;
    /**
     * Calculate profit margin
     */
    static calculateProfitMargin(revenue: number, costs: number): number;
    /**
     * Calculate compound annual growth rate (CAGR)
     */
    static calculateCAGR(beginningValue: number, endingValue: number, years: number): number;
}
/**
 * Error handling utility functions
 */
export declare class ErrorUtils {
    /**
     * Create standardized error object
     */
    static createError(code: string, message: string, details?: any): Error & {
        code: string;
        details?: any;
    };
    /**
     * Check if error is operational (expected) error
     */
    static isOperationalError(error: any): boolean;
    /**
     * Sanitize error for client response
     */
    static sanitizeError(error: any): {
        code: string;
        message: string;
        details?: any;
    };
}
/**
 * Array utility functions
 */
export declare class ArrayUtils {
    /**
     * Chunk array into smaller arrays
     */
    static chunk<T>(array: T[], size: number): T[][];
    /**
     * Remove duplicates from array
     */
    static unique<T>(array: T[]): T[];
    /**
     * Get random item from array
     */
    static randomItem<T>(array: T[]): T | undefined;
    /**
     * Shuffle array randomly
     */
    static shuffle<T>(array: T[]): T[];
}
/**
 * String utility functions
 */
export declare class StringUtils {
    /**
     * Convert string to slug
     */
    static slugify(text: string): string;
    /**
     * Truncate string with ellipsis
     */
    static truncate(text: string, length: number, suffix?: string): string;
    /**
     * Capitalize first letter
     */
    static capitalize(text: string): string;
    /**
     * Convert to title case
     */
    static titleCase(text: string): string;
    /**
     * Mask sensitive information
     */
    static mask(text: string, visibleChars?: number, maskChar?: string): string;
}
/**
 * URL utility functions
 */
export declare class UrlUtils {
    /**
     * Build URL with query parameters
     */
    static buildUrl(baseUrl: string, path: string, params?: Record<string, any>): string;
    /**
     * Parse query parameters from URL
     */
    static parseQuery(url: string): Record<string, string>;
}
/**
 * File utility functions
 */
export declare class FileUtils {
    /**
     * Get file extension
     */
    static getExtension(filename: string): string;
    /**
     * Get file size in human readable format
     */
    static formatFileSize(bytes: number): string;
    /**
     * Check if file type is allowed
     */
    static isAllowedFileType(filename: string, allowedTypes: string[]): boolean;
    /**
     * Generate unique filename
     */
    static generateUniqueFilename(originalName: string): string;
}
//# sourceMappingURL=index.d.ts.map