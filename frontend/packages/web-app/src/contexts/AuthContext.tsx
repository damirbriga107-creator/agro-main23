import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { AuthAPI } from '../services/api/auth';
import { 
  User, 
  AuthTokens, 
  LoginCredentials, 
  RegisterData, 
  AuthContextType,
  ApiError 
} from '../types/auth';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; tokens: AuthTokens } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'UPDATE_TOKENS'; payload: AuthTokens };

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload
      };
    case 'UPDATE_TOKENS':
      return {
        ...state,
        tokens: action.payload
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load stored tokens on app start
  useEffect(() => {
    const loadStoredTokens = async () => {
      try {
        const storedTokens = localStorage.getItem('auth_tokens');
        const storedUser = localStorage.getItem('auth_user');
        
        if (storedTokens && storedUser) {
          const tokens: AuthTokens = JSON.parse(storedTokens);
          const user: User = JSON.parse(storedUser);
          
          // Check if tokens are still valid
          const tokenExpiry = JSON.parse(atob(tokens.accessToken.split('.')[1])).exp * 1000;
          const now = Date.now();
          
          if (tokenExpiry > now) {
            // Token is still valid
            dispatch({ type: 'LOGIN_SUCCESS', payload: { user, tokens } });
          } else {
            // Try to refresh token
            try {
              const refreshResult = await AuthAPI.refreshToken(tokens.refreshToken);
              const updatedTokens = {
                ...tokens,
                accessToken: refreshResult.accessToken,
                expiresIn: refreshResult.expiresIn
              };
              
              localStorage.setItem('auth_tokens', JSON.stringify(updatedTokens));
              dispatch({ type: 'LOGIN_SUCCESS', payload: { user, tokens: updatedTokens } });
            } catch (error) {
              // Refresh failed, clear stored data
              localStorage.removeItem('auth_tokens');
              localStorage.removeItem('auth_user');
              dispatch({ type: 'SET_LOADING', payload: false });
            }
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error loading stored auth data:', error);
        localStorage.removeItem('auth_tokens');
        localStorage.removeItem('auth_user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadStoredTokens();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await AuthAPI.login(credentials);
      
      const { user, tokens } = response.data;
      
      // Store tokens and user data
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      localStorage.setItem('auth_user', JSON.stringify(user));
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, tokens } });
      toast.success('Login successful!');
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const apiError = error.response?.data as ApiError;
      toast.error(apiError?.error?.message || 'Login failed. Please try again.');
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await AuthAPI.register(data);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.success(response.message);
    } catch (error: any) {
      dispatch({ type: 'SET_LOADING', payload: false });
      const apiError = error.response?.data as ApiError;
      toast.error(apiError?.error?.message || 'Registration failed. Please try again.');
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (state.tokens) {
        await AuthAPI.logout();
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      // Always clear local storage and state
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
      dispatch({ type: 'LOGOUT' });
      toast.success('Logged out successfully');
    }
  };

  const refreshToken = async () => {
    if (!state.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const result = await AuthAPI.refreshToken(state.tokens.refreshToken);
      const updatedTokens = {
        ...state.tokens,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      };
      
      localStorage.setItem('auth_tokens', JSON.stringify(updatedTokens));
      dispatch({ type: 'UPDATE_TOKENS', payload: updatedTokens });
    } catch (error) {
      // Refresh failed, logout user
      logout();
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Pick<User, 'firstName' | 'lastName' | 'farmName' | 'phoneNumber'>>) => {
    try {
      const updatedUser = await AuthAPI.updateProfile(updates);
      
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const apiError = error.response?.data as ApiError;
      toast.error(apiError?.error?.message || 'Failed to update profile');
      throw error;
    }
  };

  const value: AuthContextType = {
    user: state.user,
    tokens: state.tokens,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    refreshToken,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}