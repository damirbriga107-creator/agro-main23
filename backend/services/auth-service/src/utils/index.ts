// Local utilities to resolve build dependencies
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Types
export enum UserRole {
  FARMER = 'farmer',
  ADVISOR = 'advisor', 
  ADMIN = 'admin',
  SUPPORT = 'support',
  MANAGER = 'manager'
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Password utilities
export class PasswordUtils {
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateSecure(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Token utilities
export class TokenUtils {
  static generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn: string = '15m'): string {
    return jwt.sign(payload as object, secret, { expiresIn } as any);
  }

  static generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>, secret: string, expiresIn: string = '7d'): string {
    return jwt.sign(payload as object, secret, { expiresIn } as any);
  }

  static verifyToken(token: string, secret: string): TokenPayload {
    return jwt.verify(token, secret) as TokenPayload;
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  static isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded?.exp) return true;
    return Date.now() >= decoded.exp * 1000;
  }
}

// Validation utilities
export class ValidationUtils {
  static isEmpty(value: any): boolean {
    return value === null || value === undefined || value === '';
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidPassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) errors.push('Password must be at least 8 characters long');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/\d/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) errors.push('Password must contain at least one special character');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}

// Encryption utilities
export class EncryptionUtils {
  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  static decrypt(encryptedData: string, key: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

// Config utilities
export class ServiceConfigFactory {
  static create(serviceName: string, port: number) {
    return {
      name: serviceName,
      port,
      environment: process.env.NODE_ENV || 'development',
      database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/daorsagro'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'default-jwt-secret-change-in-production',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production',
        expiresIn: '15m',
        refreshExpiresIn: '7d'
      }
    };
  }
}

export class EnvironmentUtils {
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  static getRequired(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Required environment variable '${key}' is not set`);
    }
    return value;
  }

  static get(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  static getBoolean(key: string, defaultValue: boolean = false): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  static getArray(key: string, defaultValue: string[] = []): string[] {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim());
  }

  static validateRequired(keys: string[]): void {
    const missing: string[] = [];
    for (const key of keys) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}