import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { isNull, isUndefined, isEmpty } from 'lodash';
// Export new utility modules
export * from './service-utils';
export * from './middleware';
export * from './database-connections';
export * from './logger';
/**
 * Password utility functions
 */
export class PasswordUtils {
    static SALT_ROUNDS = 12;
    /**
     * Hash a password using bcrypt
     */
    static async hash(password) {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
    /**
     * Compare a password with its hash
     */
    static async compare(password, hash) {
        return bcrypt.compare(password, hash);
    }
    /**
     * Generate a secure random password
     */
    static generateSecure(length = 12) {
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
    static generateAccessToken(payload, secret, expiresIn = '15m') {
        const opts = { expiresIn: expiresIn, algorithm: 'HS256' };
        return jwt.sign(payload, secret, opts);
    }
    /**
     * Generate JWT refresh token
     */
    static generateRefreshToken(payload, secret, expiresIn = '7d') {
        const opts = { expiresIn: expiresIn, algorithm: 'HS256' };
        return jwt.sign(payload, secret, opts);
    }
    /**
     * Verify JWT token
     */
    static verifyToken(token, secret) {
        return jwt.verify(token, secret);
    }
    /**
     * Decode JWT token without verification
     */
    static decodeToken(token) {
        try {
            return jwt.decode(token);
        }
        catch {
            return null;
        }
    }
    /**
     * Check if token is expired
     */
    static isTokenExpired(token) {
        const decoded = this.decodeToken(token);
        if (!decoded?.exp)
            return true;
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
    static isEmpty(value) {
        return isNull(value) || isUndefined(value) || isEmpty(value);
    }
    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Validate phone number format
     */
    static isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }
    /**
     * Validate UUID format
     */
    static isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Validate password strength
     */
    static isValidPassword(password) {
        const errors = [];
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
    static sanitizeString(input) {
        return input.trim().replace(/[<>]/g, '');
    }
    /**
     * Validate farm coordinates
     */
    static isValidCoordinates(lat, lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }
}
/**
 * Encryption utility functions
 */
export class EncryptionUtils {
    static ALGORITHM = 'aes-256-gcm';
    static IV_LENGTH = 16;
    static TAG_LENGTH = 16;
    /**
     * Encrypt sensitive data
     */
    static encrypt(text, key) {
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
    static decrypt(encryptedData, key) {
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
    static generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }
    /**
     * Hash data using SHA-256
     */
    static hash(data) {
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
    static now() {
        return new Date().toISOString();
    }
    /**
     * Add days to a date
     */
    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    /**
     * Add months to a date
     */
    static addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }
    /**
     * Get start of day
     */
    static startOfDay(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        return result;
    }
    /**
     * Get end of day
     */
    static endOfDay(date) {
        const result = new Date(date);
        result.setHours(23, 59, 59, 999);
        return result;
    }
    /**
     * Get start of month
     */
    static startOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    /**
     * Get end of month
     */
    static endOfMonth(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    /**
     * Get current farming season year
     */
    static getCurrentSeasonYear() {
        const now = new Date();
        const month = now.getMonth();
        // Farming season typically starts in March (month 2)
        return month >= 2 ? now.getFullYear() : now.getFullYear() - 1;
    }
    /**
     * Check if date is in the past
     */
    static isPast(date) {
        return date < new Date();
    }
    /**
     * Check if date is in the future
     */
    static isFuture(date) {
        return date > new Date();
    }
    /**
     * Format date for display
     */
    static formatDate(date, format = 'short') {
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
    static generate(length = 21) {
        return nanoid(length);
    }
    /**
     * Generate UUID v4
     */
    static generateUUID() {
        return crypto.randomUUID();
    }
    /**
     * Generate short ID for user-facing references
     */
    static generateShortId(prefix) {
        const id = nanoid(8);
        return prefix ? `${prefix}-${id}` : id;
    }
    /**
     * Generate transaction reference number
     */
    static generateTransactionRef() {
        const timestamp = Date.now().toString(36);
        const random = nanoid(6);
        return `TXN-${timestamp}-${random}`.toUpperCase();
    }
    /**
     * Generate application reference number
     */
    static generateApplicationRef() {
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
    static formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(amount);
    }
    /**
     * Format percentage
     */
    static formatPercentage(value, decimals = 2) {
        return `${(value * 100).toFixed(decimals)}%`;
    }
    /**
     * Round to decimal places
     */
    static round(number, decimals = 2) {
        return Math.round((number + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
    /**
     * Calculate percentage change
     */
    static percentageChange(oldValue, newValue) {
        if (oldValue === 0)
            return newValue === 0 ? 0 : 100;
        return ((newValue - oldValue) / oldValue) * 100;
    }
    /**
     * Calculate profit margin
     */
    static calculateProfitMargin(revenue, costs) {
        if (revenue === 0)
            return 0;
        return ((revenue - costs) / revenue) * 100;
    }
    /**
     * Calculate compound annual growth rate (CAGR)
     */
    static calculateCAGR(beginningValue, endingValue, years) {
        if (beginningValue === 0 || years === 0)
            return 0;
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
    static createError(code, message, details) {
        const error = new Error(message);
        error.code = code;
        error.details = details;
        return error;
    }
    /**
     * Check if error is operational (expected) error
     */
    static isOperationalError(error) {
        return error?.isOperational === true;
    }
    /**
     * Sanitize error for client response
     */
    static sanitizeError(error) {
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
    static chunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Remove duplicates from array
     */
    static unique(array) {
        return [...new Set(array)];
    }
    /**
     * Get random item from array
     */
    static randomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    /**
     * Shuffle array randomly
     */
    static shuffle(array) {
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
    static slugify(text) {
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
    static truncate(text, length, suffix = '...') {
        if (text.length <= length)
            return text;
        return text.substring(0, length - suffix.length) + suffix;
    }
    /**
     * Capitalize first letter
     */
    static capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    /**
     * Convert to title case
     */
    static titleCase(text) {
        return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    /**
     * Mask sensitive information
     */
    static mask(text, visibleChars = 4, maskChar = '*') {
        if (text.length <= visibleChars)
            return text;
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
    static buildUrl(baseUrl, path, params) {
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
    static parseQuery(url) {
        const urlObj = new URL(url);
        const params = {};
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
    static getExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }
    /**
     * Get file size in human readable format
     */
    static formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0)
            return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    /**
     * Check if file type is allowed
     */
    static isAllowedFileType(filename, allowedTypes) {
        const extension = this.getExtension(filename).toLowerCase();
        return allowedTypes.includes(extension);
    }
    /**
     * Generate unique filename
     */
    static generateUniqueFilename(originalName) {
        const extension = this.getExtension(originalName);
        const name = originalName.replace(`.${extension}`, '');
        const timestamp = Date.now();
        const random = nanoid(8);
        return `${StringUtils.slugify(name)}-${timestamp}-${random}.${extension}`;
    }
}
//# sourceMappingURL=index.js.map