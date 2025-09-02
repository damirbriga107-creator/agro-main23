import api from '../api';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  RegisterResponse, 
  User 
} from '../../types/auth';

export class AuthAPI {
  /**
   * Login user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/v1/auth/login', credentials);
    return response.data;
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/api/v1/auth/register', data);
    return response.data;
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    await api.post('/api/v1/auth/logout');
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await api.post('/api/v1/auth/refresh', { refreshToken }) as any;
  return (response.data as any).data;
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<void> {
    await api.post('/api/v1/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/api/v1/auth/reset-password', { token, password });
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/api/v1/auth/change-password', { currentPassword, newPassword });
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    await api.post('/api/v1/auth/verify-email', { token });
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string): Promise<void> {
    await api.post('/api/v1/auth/resend-verification', { email });
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
  const response = await api.get('/api/v1/users/profile') as any;
  return (response.data as any).data.user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<Pick<User, 'firstName' | 'lastName' | 'farmName' | 'phoneNumber'>>): Promise<User> {
  const response = await api.put('/api/v1/users/profile', updates) as any;
  return (response.data as any).data.user;
  }
}