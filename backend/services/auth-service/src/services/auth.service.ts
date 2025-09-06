import { UserRole, PasswordUtils, TokenUtils, ValidationUtils, EncryptionUtils } from '../utils';
import { PrismaService } from './prisma.service';
import { RedisService } from './redis.service';
import { EmailService } from './email.service';
import { Logger } from '../utils/logger';
import crypto from 'crypto';

export interface RegisterUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  farmName?: string;
  phoneNumber?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  farmName?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: UserProfile;
  tokens: AuthTokens;
}

/**
 * Authentication Service
 * Handles user registration, login, password management, and token operations
 */
export class AuthService {
  private logger: Logger;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private emailService: EmailService,
    config: any
  ) {
    this.logger = new Logger('auth-service');
    this.jwtSecret = config.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtRefreshSecret = config.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
  }

  /**
   * Register a new user
   */
  async registerUser(userData: RegisterUserData): Promise<{ user: UserProfile; emailVerificationRequired: boolean }> {
    try {
      const { email, password, firstName, lastName, role = 'FARMER', farmName, phoneNumber } = userData; // UserRole.FARMER

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = ValidationUtils.isValidPassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      // Check if user already exists
      const existingUser = await this.prisma.client.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hash(password);

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create user in database
      const user = await this.prisma.client.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role,
          farmName,
          phoneNumber,
          emailVerificationToken,
          emailVerificationExpiry,
          isEmailVerified: false
        }
      });

      // Send verification email
      try {
        await this.emailService.sendEmailVerification(email, firstName, emailVerificationToken);
      } catch (emailError) {
        this.logger.warn('Failed to send verification email', emailError);
      }

      // Convert to UserProfile
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isEmailVerified: user.isEmailVerified,
        farmName: user.farmName,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      this.logger.info('User registered successfully', { userId: user.id, email });

      return {
        user: userProfile,
        emailVerificationRequired: true
      };
    } catch (error) {
      this.logger.error('User registration failed', error);
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async loginUser(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;

      // Find user by email
      const user = await this.prisma.client.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if account is active
      if (user.status !== 'ACTIVE') {
        throw new Error('Account is not active');
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

      // Convert to UserProfile
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isEmailVerified: user.isEmailVerified,
        farmName: user.farmName,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      this.logger.info('User logged in successfully', { userId: user.id, email });

      return {
        user: userProfile,
        tokens
      };
    } catch (error) {
      this.logger.error('User login failed', error);
      throw error;
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: UserRole): Promise<AuthTokens> {
    const tokenPayload = { userId, email, role };
    
    const accessToken = TokenUtils.generateAccessToken(tokenPayload, this.jwtSecret, '15m');
    const refreshToken = TokenUtils.generateRefreshToken(tokenPayload, this.jwtRefreshSecret, '7d');
    
    // Store refresh token in Redis with expiry
    const refreshTokenKey = `refresh_token:${userId}`;
    await this.redis.set(refreshTokenKey, refreshToken, 7 * 24 * 60 * 60); // 7 days
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const decoded = TokenUtils.verifyToken(refreshToken, this.jwtRefreshSecret);
      
      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user from database
      const user = await this.prisma.client.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const tokenPayload = { userId: user.id, email: user.email, role: user.role as UserRole };
      const accessToken = TokenUtils.generateAccessToken(tokenPayload, this.jwtSecret, '15m');

      this.logger.info('Token refreshed successfully', { userId: user.id });

      return {
        accessToken,
        expiresIn: 900
      };
    } catch (error) {
      this.logger.error('Token refresh failed', error);
      throw error;
    }
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logoutUser(userId: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await this.redis.del(`refresh_token:${userId}`);
      
      this.logger.info('User logged out successfully', { userId });
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw error;
    }
  }

  /**
   * Verify email with verification token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const user = await this.prisma.client.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired verification token');
      }

      // Update user as verified
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null
        }
      });

      this.logger.info('Email verified successfully', { userId: user.id });
    } catch (error) {
      this.logger.error('Email verification failed', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal if email exists
        this.logger.warn('Password reset requested for non-existent email', { email });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetTokenExpiry
        }
      });

      // Send reset email
      await this.emailService.sendPasswordResetEmail(email, user.firstName, resetToken);

      this.logger.info('Password reset requested', { userId: user.id });
    } catch (error) {
      this.logger.error('Password reset request failed', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      const passwordValidation = ValidationUtils.isValidPassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      const user = await this.prisma.client.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hash(newPassword);

      // Update password and clear reset token
      await this.prisma.client.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null
        }
      });

      // Invalidate all existing refresh tokens
      await this.redis.del(`refresh_token:${user.id}`);

      this.logger.info('Password reset successfully', { userId: user.id });
    } catch (error) {
      this.logger.error('Password reset failed', error);
      throw error;
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Validate new password
      const passwordValidation = ValidationUtils.isValidPassword(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordUtils.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hash(newPassword);

      // Update password
      await this.prisma.client.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Invalidate all existing refresh tokens
      await this.redis.del(`refresh_token:${userId}`);

      this.logger.info('Password changed successfully', { userId });
    } catch (error) {
      this.logger.error('Password change failed', error);
      throw error;
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isEmailVerified: user.isEmailVerified,
        farmName: user.farmName,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      this.logger.error('Failed to get user profile', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<Pick<RegisterUserData, 'firstName' | 'lastName' | 'farmName' | 'phoneNumber'>>): Promise<UserProfile> {
    try {
      const user = await this.prisma.client.user.update({
        where: { id: userId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      this.logger.info('User profile updated', { userId });

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        isEmailVerified: user.isEmailVerified,
        farmName: user.farmName,
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      this.logger.error('Failed to update user profile', error);
      throw error;
    }
  }
}