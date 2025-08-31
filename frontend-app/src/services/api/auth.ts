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
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    await api.post('/auth/logout');
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data.data;
  }

  /**
   * Request password reset
   */
  static async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  }

  /**
   * Change password for authenticated user
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token });
  }

  /**
   * Resend verification email
   */
  static async resendVerification(email: string): Promise<void> {
    await api.post('/auth/resend-verification', { email });
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
    const response = await api.get<{ success: boolean; data: { user: User } }>('/users/profile');
    return response.data.data.user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<Pick<User, 'firstName' | 'lastName' | 'farmName' | 'phoneNumber'>>): Promise<User> {
    const response = await api.put<{ success: boolean; data: { user: User } }>('/users/profile', updates);
    return response.data.data.user;
  }
}
