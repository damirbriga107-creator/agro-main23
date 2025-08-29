import axios from 'axios'
import type { LoginResponse, RegisterResponse, User } from '../../types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          })
          
          const { accessToken } = response.data.data.tokens
          localStorage.setItem('accessToken', accessToken)
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', { email, password })
  return response.data.data
}

export const register = async (data: RegisterData): Promise<RegisterResponse> => {
  const response = await api.post('/auth/register', data)
  return response.data.data
}

export const logout = async (refreshToken: string): Promise<void> => {
  await api.post('/auth/logout', { refreshToken })
}

export const refreshToken = async (refreshToken: string) => {
  const response = await api.post('/auth/refresh', { refreshToken })
  return response.data.data
}

export const getCurrentUser = async (): Promise<{ user: User }> => {
  const response = await api.get('/users/me')
  return response.data.data
}

export const forgotPassword = async (email: string): Promise<void> => {
  await api.post('/auth/forgot-password', { email })
}

export const resetPassword = async (token: string, password: string): Promise<void> => {
  await api.post('/auth/reset-password', { token, password })
}

export const verifyEmail = async (token: string): Promise<void> => {
  await api.post('/auth/verify-email', { token })
}