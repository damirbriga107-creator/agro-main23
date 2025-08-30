export interface Transaction {
  id: string;
  farmId: string;
  categoryId: string;
  amount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  description: string;
  transactionDate: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'OTHER';
  vendorName?: string;
  invoiceNumber?: string;
  tags?: string[];
  category?: Category;
  farm?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  farmId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  categories: BudgetCategory[];
  farm?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  category?: Category;
}

export interface FinancialSummary {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  transactionCount: number;
  averageTransactionSize: number;
  topExpenseCategories: CategorySummary[];
  topRevenueCategories: CategorySummary[];
}

export interface CategorySummary {
  category?: Category;
  transactionType: 'INCOME' | 'EXPENSE';
  totalAmount: number;
  transactionCount: number;
}

export interface ProfitLossReport {
  period: {
    startDate: string;
    endDate: string;
  };
  revenue: CategorySummary[];
  expenses: CategorySummary[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
}

export interface CashFlowReport {
  period: {
    startDate: string;
    endDate: string;
  };
  monthlyData: MonthlyFlowData[];
  summary: {
    totalInflow: number;
    totalOutflow: number;
    netFlow: number;
    averageMonthlyInflow: number;
    averageMonthlyOutflow: number;
  };
}

export interface MonthlyFlowData {
  month: string;
  year: number;
  inflow: number;
  outflow: number;
  netFlow: number;
}

export interface BudgetAnalysisReport {
  budgetId: string;
  budgetName: string;
  period: {
    startDate: string;
    endDate: string;
  };
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  usagePercentage: number;
  categories: BudgetCategoryAnalysis[];
  summary: {
    overBudgetCategories: number;
    onTrackCategories: number;
    underBudgetCategories: number;
  };
}

export interface BudgetCategoryAnalysis {
  category?: Category;
  allocatedAmount: number;
  actualSpent: number;
  remainingAmount: number;
  usagePercentage: number;
  status: 'UNDER_BUDGET' | 'ON_TRACK' | 'OVER_BUDGET';
  variance: number;
  variancePercentage: number;
}

export interface CreateTransactionData {
  farmId: string;
  categoryId: string;
  amount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  description: string;
  transactionDate: string;
  paymentMethod?: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CHECK' | 'OTHER';
  vendorName?: string;
  invoiceNumber?: string;
  tags?: string[];
}

export interface CreateBudgetData {
  farmId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  categories: {
    categoryId: string;
    allocatedAmount: number;
  }[];
}

export interface FinancialFilters {
  farmId?: string;
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  transactionType?: 'INCOME' | 'EXPENSE';
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlyTrend: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  topCategories: {
    income: CategorySummary[];
    expense: CategorySummary[];
  };
  recentTransactions: Transaction[];
  activeBudgets: Budget[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}