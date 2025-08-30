export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'FARMER' | 'ADVISOR' | 'ADMIN' | 'SUPPORT';
  isEmailVerified: boolean;
  farmName?: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'FARMER' | 'ADVISOR' | 'ADMIN' | 'SUPPORT';
  farmName?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerificationRequired: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<User, 'firstName' | 'lastName' | 'farmName' | 'phoneNumber'>>) => Promise<void>;
}