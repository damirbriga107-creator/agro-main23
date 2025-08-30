import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { logger } from '../utils/logger';

export interface ReportFilters {
  farmId: string;
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
}

export interface ProfitLossReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    total: Decimal;
    byCategory: CategorySummary[];
  };
  expenses: {
    total: Decimal;
    byCategory: CategorySummary[];
  };
  netProfit: Decimal;
  profitMargin: Decimal;
}

export interface CashFlowReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  openingBalance: Decimal;
  cashInflows: {
    total: Decimal;
    transactions: CashFlowItem[];
  };
  cashOutflows: {
    total: Decimal;
    transactions: CashFlowItem[];
  };
  netCashFlow: Decimal;
  closingBalance: Decimal;
}

export interface CashFlowItem {
  date: Date;
  description: string;
  amount: Decimal;
  category: string;
  type: 'INFLOW' | 'OUTFLOW';
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  amount: Decimal;
  transactionCount: number;
  percentage: Decimal;
}

export interface BudgetAnalysisReport {
  budgetId: string;
  budgetName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalBudget: Decimal;
  totalSpent: Decimal;
  remainingBudget: Decimal;
  usagePercentage: Decimal;
  categories: BudgetCategoryAnalysis[];
  summary: {
    overBudgetCategories: number;
    onTrackCategories: number;
    underBudgetCategories: number;
  };
}

export interface BudgetCategoryAnalysis {
  categoryId: string;
  categoryName: string;
  budgetedAmount: Decimal;
  actualSpent: Decimal;
  variance: Decimal;
  variancePercentage: Decimal;
  status: 'OVER_BUDGET' | 'ON_TRACK' | 'UNDER_BUDGET';
}

export interface CropProfitabilityReport {
  farmId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  crops: CropProfitability[];
  totalRevenue: Decimal;
  totalCosts: Decimal;
  totalProfit: Decimal;
}

export interface CropProfitability {
  cropName: string;
  revenue: Decimal;
  costs: {
    seeds: Decimal;
    fertilizers: Decimal;
    labor: Decimal;
    equipment: Decimal;
    other: Decimal;
    total: Decimal;
  };
  profit: Decimal;
  profitMargin: Decimal;
  roi: Decimal; // Return on Investment
}

export interface FinancialSummary {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: Decimal;
  expenses: Decimal;
  netProfit: Decimal;
  profitMargin: Decimal;
  transactionCount: number;
  averageTransactionSize: Decimal;
  topExpenseCategories: CategorySummary[];
  topRevenueCategories: CategorySummary[];
}

/**
 * Report Service
 * Handles all financial reporting business logic
 */
export class ReportService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate Profit & Loss Report
   */
  async generateProfitLossReport(filters: ReportFilters): Promise<ProfitLossReport> {
    try {
      const { farmId, startDate, endDate, categoryIds } = filters;
      
      const where: any = { farmId };
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = startDate;
        if (endDate) where.transactionDate.lte = endDate;
      }
      if (categoryIds) where.categoryId = { in: categoryIds };

      // Get revenue (income) transactions
      const revenueTransactions = await this.prisma.transaction.findMany({
        where: { ...where, transactionType: 'INCOME' },
        include: { category: true }
      });

      // Get expense transactions
      const expenseTransactions = await this.prisma.transaction.findMany({
        where: { ...where, transactionType: 'EXPENSE' },
        include: { category: true }
      });

      // Calculate revenue by category
      const revenueByCategory = this.groupByCategory(revenueTransactions);
      const expensesByCategory = this.groupByCategory(expenseTransactions);

      const totalRevenue = revenueByCategory.reduce((sum, cat) => sum.add(cat.amount), new Decimal(0));
      const totalExpenses = expensesByCategory.reduce((sum, cat) => sum.add(cat.amount), new Decimal(0));
      const netProfit = totalRevenue.minus(totalExpenses);
      const profitMargin = totalRevenue.gt(0) ? netProfit.div(totalRevenue).mul(100) : new Decimal(0);

      return {
        period: {
          startDate: startDate || new Date(new Date().getFullYear(), 0, 1),
          endDate: endDate || new Date()
        },
        revenue: {
          total: totalRevenue,
          byCategory: revenueByCategory
        },
        expenses: {
          total: totalExpenses,
          byCategory: expensesByCategory
        },
        netProfit,
        profitMargin
      };
    } catch (error) {
      logger.error('Error generating profit & loss report:', error);
      throw error;
    }
  }

  /**
   * Generate Cash Flow Report
   */
  async generateCashFlowReport(filters: ReportFilters): Promise<CashFlowReport> {
    try {
      const { farmId, startDate, endDate } = filters;
      
      const where: any = { farmId };
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = startDate;
        if (endDate) where.transactionDate.lte = endDate;
      }

      const transactions = await this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { transactionDate: 'asc' }
      });

      const cashInflows: CashFlowItem[] = [];
      const cashOutflows: CashFlowItem[] = [];

      let totalInflows = new Decimal(0);
      let totalOutflows = new Decimal(0);

      transactions.forEach(transaction => {
        const item: CashFlowItem = {
          date: transaction.transactionDate,
          description: transaction.description || `${transaction.category.name} transaction`,
          amount: transaction.amount,
          category: transaction.category.name,
          type: transaction.transactionType === 'INCOME' ? 'INFLOW' : 'OUTFLOW'
        };

        if (transaction.transactionType === 'INCOME') {
          cashInflows.push(item);
          totalInflows = totalInflows.add(transaction.amount);
        } else {
          cashOutflows.push(item);
          totalOutflows = totalOutflows.add(transaction.amount);
        }
      });

      // Calculate opening balance (simplified - assume 0 for now)
      const openingBalance = new Decimal(0);
      const netCashFlow = totalInflows.minus(totalOutflows);
      const closingBalance = openingBalance.add(netCashFlow);

      return {
        period: {
          startDate: startDate || new Date(new Date().getFullYear(), 0, 1),
          endDate: endDate || new Date()
        },
        openingBalance,
        cashInflows: {
          total: totalInflows,
          transactions: cashInflows
        },
        cashOutflows: {
          total: totalOutflows,
          transactions: cashOutflows
        },
        netCashFlow,
        closingBalance
      };
    } catch (error) {
      logger.error('Error generating cash flow report:', error);
      throw error;
    }
  }

  /**
   * Generate Budget Analysis Report
   */
  async generateBudgetAnalysisReport(budgetId: string): Promise<BudgetAnalysisReport> {
    try {
      const budget = await this.prisma.budget.findUnique({
        where: { id: budgetId },
        include: {
          allocations: {
            include: { category: true }
          }
        }
      });

      if (!budget) {
        throw new Error('Budget not found');
      }

      const categories: BudgetCategoryAnalysis[] = [];
      let overBudgetCount = 0;
      let onTrackCount = 0;
      let underBudgetCount = 0;

      for (const allocation of budget.allocations) {
        const variance = allocation.spentAmount.minus(allocation.allocatedAmount);
        const variancePercentage = allocation.allocatedAmount.gt(0)
          ? variance.div(allocation.allocatedAmount).mul(100)
          : new Decimal(0);

        let status: 'OVER_BUDGET' | 'ON_TRACK' | 'UNDER_BUDGET';
        if (variance.gt(0)) {
          status = 'OVER_BUDGET';
          overBudgetCount++;
        } else if (variancePercentage.gte(-10)) { // Within 10% of budget
          status = 'ON_TRACK';
          onTrackCount++;
        } else {
          status = 'UNDER_BUDGET';
          underBudgetCount++;
        }

        categories.push({
          categoryId: allocation.categoryId,
          categoryName: allocation.category.name,
          budgetedAmount: allocation.allocatedAmount,
          actualSpent: allocation.spentAmount,
          variance,
          variancePercentage,
          status
        });
      }

      const totalSpent = categories.reduce((sum, cat) => sum.add(cat.actualSpent), new Decimal(0));
      const remainingBudget = budget.totalBudget.minus(totalSpent);
      const usagePercentage = budget.totalBudget.gt(0)
        ? totalSpent.div(budget.totalBudget).mul(100)
        : new Decimal(0);

      return {
        budgetId: budget.id,
        budgetName: budget.name,
        period: {
          startDate: budget.startDate,
          endDate: budget.endDate
        },
        totalBudget: budget.totalBudget,
        totalSpent,
        remainingBudget,
        usagePercentage,
        categories,
        summary: {
          overBudgetCategories: overBudgetCount,
          onTrackCategories: onTrackCount,
          underBudgetCategories: underBudgetCount
        }
      };
    } catch (error) {
      logger.error('Error generating budget analysis report:', error);
      throw error;
    }
  }

  /**
   * Generate Financial Summary Report
   */
  async generateFinancialSummary(filters: ReportFilters): Promise<FinancialSummary> {
    try {
      const { farmId, startDate, endDate } = filters;
      
      const where: any = { farmId };
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = startDate;
        if (endDate) where.transactionDate.lte = endDate;
      }

      const [transactions, aggregateResult] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: { category: true }
        }),
        this.prisma.transaction.aggregate({
          where,
          _sum: { amount: true },
          _count: { id: true }
        })
      ]);

      const revenue = transactions
        .filter(t => t.transactionType === 'INCOME')
        .reduce((sum, t) => sum.add(t.amount), new Decimal(0));

      const expenses = transactions
        .filter(t => t.transactionType === 'EXPENSE')
        .reduce((sum, t) => sum.add(t.amount), new Decimal(0));

      const netProfit = revenue.minus(expenses);
      const profitMargin = revenue.gt(0) ? netProfit.div(revenue).mul(100) : new Decimal(0);
      
      const totalAmount = new Decimal(aggregateResult._sum.amount || 0);
      const transactionCount = aggregateResult._count.id;
      const averageTransactionSize = transactionCount > 0 
        ? totalAmount.div(transactionCount) 
        : new Decimal(0);

      // Get top categories
      const expenseTransactions = transactions.filter(t => t.transactionType === 'EXPENSE');
      const revenueTransactions = transactions.filter(t => t.transactionType === 'INCOME');
      
      const topExpenseCategories = this.groupByCategory(expenseTransactions)
        .sort((a, b) => b.amount.minus(a.amount).toNumber())
        .slice(0, 5);

      const topRevenueCategories = this.groupByCategory(revenueTransactions)
        .sort((a, b) => b.amount.minus(a.amount).toNumber())
        .slice(0, 5);

      return {
        period: {
          startDate: startDate || new Date(new Date().getFullYear(), 0, 1),
          endDate: endDate || new Date()
        },
        revenue,
        expenses,
        netProfit,
        profitMargin,
        transactionCount,
        averageTransactionSize,
        topExpenseCategories,
        topRevenueCategories
      };
    } catch (error) {
      logger.error('Error generating financial summary:', error);
      throw error;
    }
  }

  /**
   * Get monthly trend data
   */
  async getMonthlyTrends(farmId: string, year: number) {
    try {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const transactions = await this.prisma.transaction.findMany({
        where: {
          farmId,
          transactionDate: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { transactionDate: 'asc' }
      });

      const monthlyData = Array.from({ length: 12 }, (_, index) => ({
        month: index + 1,
        monthName: new Date(year, index).toLocaleString('default', { month: 'long' }),
        revenue: new Decimal(0),
        expenses: new Decimal(0),
        netProfit: new Decimal(0),
        transactionCount: 0
      }));

      transactions.forEach(transaction => {
        const month = transaction.transactionDate.getMonth();
        monthlyData[month].transactionCount++;
        
        if (transaction.transactionType === 'INCOME') {
          monthlyData[month].revenue = monthlyData[month].revenue.add(transaction.amount);
        } else {
          monthlyData[month].expenses = monthlyData[month].expenses.add(transaction.amount);
        }
        
        monthlyData[month].netProfit = monthlyData[month].revenue.minus(monthlyData[month].expenses);
      });

      return monthlyData;
    } catch (error) {
      logger.error('Error generating monthly trends:', error);
      throw error;
    }
  }

  /**
   * Helper method to group transactions by category
   */
  private groupByCategory(transactions: any[]): CategorySummary[] {
    const categoryMap = new Map<string, { amount: Decimal; count: number; name: string }>();
    
    transactions.forEach(transaction => {
      const categoryId = transaction.categoryId;
      const categoryName = transaction.category.name;
      const amount = transaction.amount;
      
      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!;
        existing.amount = existing.amount.add(amount);
        existing.count++;
      } else {
        categoryMap.set(categoryId, {
          amount: new Decimal(amount),
          count: 1,
          name: categoryName
        });
      }
    });

    const totalAmount = Array.from(categoryMap.values())
      .reduce((sum, cat) => sum.add(cat.amount), new Decimal(0));

    return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      amount: data.amount,
      transactionCount: data.count,
      percentage: totalAmount.gt(0) ? data.amount.div(totalAmount).mul(100) : new Decimal(0)
    }));
  }
}