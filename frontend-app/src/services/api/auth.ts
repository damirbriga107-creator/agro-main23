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
   * - Compatible with both full Auth Service (expects {user,tokens})
   *   and the simple demo auth service (returns {token,user}).
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Send both email and username for compatibility with demo auth
    const payload: any = {
      email: credentials.email,
      username: credentials.email,
      password: credentials.password,
    };

    const res: any = await api.post<any>('/api/v1/auth/login', payload);

    // If full service shape already
    if (res && res.success && res.data?.tokens && res.data?.user) {
      return res as AuthResponse;
    }

    // Adapt simple demo auth service shape { token, user }
    if (res && res.success && res.data?.token && res.data?.user) {
      const demoUser = res.data.user;
      const mappedUser: User = {
        id: String(demoUser.id ?? demoUser.userId ?? '1'),
        email: demoUser.email ?? credentials.email,
        firstName: demoUser.profile?.firstName ?? 'Admin',
        lastName: demoUser.profile?.lastName ?? 'User',
        role: String(demoUser.role || 'ADMIN').toUpperCase() as User['role'],
        isEmailVerified: true,
        farmName: demoUser.farmId ? String(demoUser.farmId) : undefined,
        phoneNumber: demoUser.profile?.phone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const adapted: AuthResponse = {
        success: true,
        message: res.message || 'Login successful',
        data: {
          user: mappedUser,
          tokens: {
            accessToken: res.data.token,
            refreshToken: res.data.token, // demo only
            expiresIn: 24 * 60 * 60, // 24h
          },
        },
      };

      return adapted;
    }

    throw new Error('Unexpected login response shape');
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