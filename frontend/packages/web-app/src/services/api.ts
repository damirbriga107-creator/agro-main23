import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  requestId?: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime?: number;
  checks?: Record<string, any>;
}

export interface DashboardMetrics {
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    financial: {
      total_revenue: number;
      total_expenses: number;
      net_profit: number;
      active_farms: number;
      avg_revenue_per_transaction: number;
    };
    production: {
      total_production: number;
      avg_production_per_farm: number;
      producing_farms: number;
      crop_varieties: number;
      avg_quality_score: number;
    };
    users: {
      total_active_users: number;
      new_registrations: number;
      login_count: number;
      avg_session_duration: number;
    };
    subsidies: {
      total_subsidies: number;
      total_applications: number;
      approved_applications: number;
      approval_rate: number;
      avg_processing_time: number;
    };
    insurance: {
      total_premiums: number;
      total_claims: number;
      active_policies: number;
      total_claims_count: number;
      avg_claim_amount: number;
    };
  };
  trends: any;
  alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'error';
    title: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Enhanced API client with authentication and error handling
 */
class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for adding auth token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from localStorage that was stored by AuthContext
        const authTokens = localStorage.getItem('auth_tokens');
        if (authTokens) {
          try {
            const tokens = JSON.parse(authTokens);
            config.headers.Authorization = `Bearer ${tokens.accessToken}`;
          } catch (error) {
            console.warn('Failed to parse auth tokens:', error);
          }
        }
        
        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for handling auth errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshToken();
            const token = localStorage.getItem('accessToken');
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.clearAuth();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private generateRequestId(): string {
    return `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async refreshToken(): Promise<void> {
    const authTokens = localStorage.getItem('auth_tokens');
    if (!authTokens) {
      throw new Error('No refresh token available');
    }

    try {
      const tokens = JSON.parse(authTokens);
      const response = await axios.post(`${this.baseURL}/api/v1/auth/refresh`, {
        refreshToken: tokens.refreshToken,
      });

      if (response.data.success) {
        const updatedTokens = {
          ...tokens,
          accessToken: response.data.data.accessToken,
          expiresIn: response.data.data.expiresIn
        };
        localStorage.setItem('auth_tokens', JSON.stringify(updatedTokens));
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }

  private clearAuth(): void {
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_user');
  }

  // Generic API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config);
    return response.data;
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{
    user: any;
    accessToken: string;
    refreshToken: string;
  }>> {
    return this.post('/api/v1/auth/login', { email, password });
  }

  async logout(): Promise<ApiResponse<any>> {
    try {
      const result = await this.post('/api/v1/auth/logout');
      this.clearAuth();
      return result;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/auth/me');
  }

  // Dashboard methods
  async getDashboardMetrics(period: string = '30d'): Promise<ApiResponse<DashboardMetrics>> {
    return this.get(`/api/v1/analytics/dashboard?period=${period}`);
  }

  async getDashboardSummary(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/analytics/dashboard/summary');
  }

  async getDashboardKPIs(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/analytics/dashboard/kpis');
  }

  async getDashboardAlerts(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/analytics/dashboard/alerts');
  }

  // Service health methods
  async getServiceHealth(): Promise<ApiResponse<HealthStatus[]>> {
    return this.get('/api/services');
  }

  async getGatewayHealth(): Promise<HealthStatus> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Financial methods
  async getFinancialMetrics(params?: any): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/v1/financial/reports/summary${queryString}`);
  }

  async getFinancialSummary(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/financial/reports/summary');
  }

  async getFinancialTransactions(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/v1/financial/transactions${queryString}`);
  }

  async createTransaction(data: any): Promise<ApiResponse<any>> {
    return this.post('/api/v1/financial/transactions', data);
  }

  async updateTransaction(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/api/v1/financial/transactions/${id}`, data);
  }

  async deleteTransaction(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/api/v1/financial/transactions/${id}`);
  }

  async getBudgets(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/v1/financial/budgets${queryString}`);
  }

  async createBudget(data: any): Promise<ApiResponse<any>> {
    return this.post('/api/v1/financial/budgets', data);
  }

  async updateBudget(id: string, data: any): Promise<ApiResponse<any>> {
    return this.put(`/api/v1/financial/budgets/${id}`, data);
  }

  async deleteBudget(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/api/v1/financial/budgets/${id}`);
  }

  async getCategories(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/v1/financial/categories${queryString}`);
  }

  async createCategory(data: any): Promise<ApiResponse<any>> {
    return this.post('/api/v1/financial/categories', data);
  }

  async getProfitLossReport(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/v1/financial/reports/profit-loss${queryString}`);
  }

  async getCashFlowReport(params?: any): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/api/v1/financial/reports/cash-flow${queryString}`);
  }

  async getBudgetAnalysisReport(budgetId: string): Promise<ApiResponse<any>> {
    return this.get(`/api/v1/financial/reports/budget-analysis/${budgetId}`);
  }

  // IoT methods
  async getIoTDevices(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/iot/devices');
  }

  async getIoTSummary(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/iot/summary');
  }

  async getSensorData(deviceId: string, hours: number = 24): Promise<ApiResponse<any>> {
    return this.get(`/api/v1/iot/data/${deviceId}?hours=${hours}`);
  }

  // Subsidy methods
  async getSubsidies(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/subsidies');
  }

  async getSubsidyApplications(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/subsidies/applications');
  }

  // Insurance methods
  async getInsurancePolicies(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/insurance/policies');
  }

  async getInsuranceClaims(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/insurance/claims');
  }

  // Document methods
  async getDocuments(): Promise<ApiResponse<any>> {
    return this.get('/api/v1/documents');
  }

  async uploadDocument(file: File, metadata?: any): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.post('/api/v1/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export individual service APIs for better organization
export const authApi = {
  login: (email: string, password: string) => apiClient.login(email, password),
  logout: () => apiClient.logout(),
  getCurrentUser: () => apiClient.getCurrentUser(),
};

export const dashboardApi = {
  getMetrics: (period?: string) => apiClient.getDashboardMetrics(period),
  getSummary: () => apiClient.getDashboardSummary(),
  getKPIs: () => apiClient.getDashboardKPIs(),
  getAlerts: () => apiClient.getDashboardAlerts(),
  getServiceHealth: () => apiClient.getServiceHealth(),
  getGatewayHealth: () => apiClient.getGatewayHealth(),
};

export const financialApi = {
  getMetrics: (params?: any) => apiClient.getFinancialMetrics(params),
  getSummary: () => apiClient.getFinancialSummary(),
  getTransactions: (params?: any) => apiClient.getFinancialTransactions(params),
  createTransaction: (data: any) => apiClient.createTransaction(data),
  updateTransaction: (id: string, data: any) => apiClient.updateTransaction(id, data),
  deleteTransaction: (id: string) => apiClient.deleteTransaction(id),
  getBudgets: (params?: any) => apiClient.getBudgets(params),
  createBudget: (data: any) => apiClient.createBudget(data),
  updateBudget: (id: string, data: any) => apiClient.updateBudget(id, data),
  deleteBudget: (id: string) => apiClient.deleteBudget(id),
  getCategories: (params?: any) => apiClient.getCategories(params),
  createCategory: (data: any) => apiClient.createCategory(data),
  getProfitLossReport: (params?: any) => apiClient.getProfitLossReport(params),
  getCashFlowReport: (params?: any) => apiClient.getCashFlowReport(params),
  getBudgetAnalysisReport: (budgetId: string) => apiClient.getBudgetAnalysisReport(budgetId),
};

export const iotApi = {
  getDevices: () => apiClient.getIoTDevices(),
  getSummary: () => apiClient.getIoTSummary(),
  getSensorData: (deviceId: string, hours?: number) => apiClient.getSensorData(deviceId, hours),
};

export const subsidyApi = {
  getSubsidies: () => apiClient.getSubsidies(),
  getApplications: () => apiClient.getSubsidyApplications(),
};

export const insuranceApi = {
  getPolicies: () => apiClient.getInsurancePolicies(),
  getClaims: () => apiClient.getInsuranceClaims(),
};

export const documentApi = {
  getDocuments: () => apiClient.getDocuments(),
  upload: (file: File, metadata?: any) => apiClient.uploadDocument(file, metadata),
};

export default apiClient;