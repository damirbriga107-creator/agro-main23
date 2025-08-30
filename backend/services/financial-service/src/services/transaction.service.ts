import { PrismaClient, Transaction, Budget } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { producer } from '../index';
import { logger } from '../utils/logger';

export interface CreateTransactionData {
  farmId: string;
  categoryId: string;
  amount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  description?: string;
  transactionDate?: Date;
  paymentMethod?: string;
  vendorName?: string;
  invoiceNumber?: string;
  tags?: string[];
  userId: string;
}

export interface UpdateTransactionData {
  categoryId?: string;
  amount?: number;
  description?: string;
  transactionDate?: Date;
  paymentMethod?: string;
  vendorName?: string;
  invoiceNumber?: string;
  tags?: string[];
}

export interface TransactionFilters {
  farmId?: string;
  categoryId?: string;
  transactionType?: 'INCOME' | 'EXPENSE';
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export interface TransactionSummary {
  totalIncome: Decimal;
  totalExpenses: Decimal;
  netProfit: Decimal;
  transactionCount: number;
  averageTransaction: Decimal;
}

/**
 * Transaction Service
 * Handles all transaction-related business logic
 */
export class TransactionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          farmId: data.farmId,
          categoryId: data.categoryId,
          amount: new Decimal(data.amount),
          transactionType: data.transactionType,
          description: data.description,
          transactionDate: data.transactionDate || new Date(),
          paymentMethod: data.paymentMethod,
          vendorName: data.vendorName,
          invoiceNumber: data.invoiceNumber,
          tags: data.tags || [],
          userId: data.userId,
        },
        include: {
          category: true,
          farm: {
            select: { id: true, name: true }
          }
        }
      });

      // Emit event for real-time updates
      await this.publishTransactionEvent('transaction.created', transaction);

      // Update budget if applicable
      await this.updateBudgetOnTransaction(transaction);

      logger.info(`Transaction created: ${transaction.id}`);
      return transaction;
    } catch (error) {
      logger.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(
    filters: TransactionFilters,
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'transactionDate',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (filters.farmId) where.farmId = filters.farmId;
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.transactionType) where.transactionType = filters.transactionType;
      if (filters.userId) where.userId = filters.userId;
      
      if (filters.startDate || filters.endDate) {
        where.transactionDate = {};
        if (filters.startDate) where.transactionDate.gte = filters.startDate;
        if (filters.endDate) where.transactionDate.lte = filters.endDate;
      }

      const [transactions, total] = await Promise.all([
        this.prisma.transaction.findMany({
          where,
          include: {
            category: true,
            farm: {
              select: { id: true, name: true }
            }
          },
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.transaction.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      return await this.prisma.transaction.findUnique({
        where: { id },
        include: {
          category: true,
          farm: {
            select: { id: true, name: true }
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(id: string, data: UpdateTransactionData): Promise<Transaction> {
    try {
      const updateData: any = { ...data };
      
      if (data.amount) {
        updateData.amount = new Decimal(data.amount);
      }

      const transaction = await this.prisma.transaction.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          farm: {
            select: { id: true, name: true }
          }
        }
      });

      // Emit event for real-time updates
      await this.publishTransactionEvent('transaction.updated', transaction);

      logger.info(`Transaction updated: ${transaction.id}`);
      return transaction;
    } catch (error) {
      logger.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Delete transaction
   */
  async deleteTransaction(id: string): Promise<void> {
    try {
      const transaction = await this.prisma.transaction.findUnique({ where: { id } });
      
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      await this.prisma.transaction.delete({ where: { id } });

      // Emit event for real-time updates
      await this.publishTransactionEvent('transaction.deleted', transaction);

      logger.info(`Transaction deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary for a farm
   */
  async getTransactionSummary(farmId: string, startDate?: Date, endDate?: Date): Promise<TransactionSummary> {
    try {
      const where: any = { farmId };
      
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = startDate;
        if (endDate) where.transactionDate.lte = endDate;
      }

      const [incomeResult, expenseResult, totalCount] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: { ...where, transactionType: 'INCOME' },
          _sum: { amount: true },
          _count: { id: true }
        }),
        this.prisma.transaction.aggregate({
          where: { ...where, transactionType: 'EXPENSE' },
          _sum: { amount: true },
          _count: { id: true }
        }),
        this.prisma.transaction.count({ where })
      ]);

      const totalIncome = new Decimal(incomeResult._sum.amount || 0);
      const totalExpenses = new Decimal(expenseResult._sum.amount || 0);
      const netProfit = totalIncome.minus(totalExpenses);
      const averageTransaction = totalCount > 0 ? totalIncome.plus(totalExpenses).div(totalCount) : new Decimal(0);

      return {
        totalIncome,
        totalExpenses,
        netProfit,
        transactionCount: totalCount,
        averageTransaction
      };
    } catch (error) {
      logger.error('Error calculating transaction summary:', error);
      throw error;
    }
  }

  /**
   * Get transactions by category for reporting
   */
  async getTransactionsByCategory(farmId: string, startDate?: Date, endDate?: Date) {
    try {
      const where: any = { farmId };
      
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate.gte = startDate;
        if (endDate) where.transactionDate.lte = endDate;
      }

      const categoryData = await this.prisma.transaction.groupBy({
        by: ['categoryId', 'transactionType'],
        where,
        _sum: { amount: true },
        _count: { id: true }
      });

      // Get category details
      const categoryIds = [...new Set(categoryData.map(item => item.categoryId))];
      const categories = await this.prisma.category.findMany({
        where: { id: { in: categoryIds } }
      });

      const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

      return categoryData.map(item => ({
        category: categoryMap.get(item.categoryId),
        transactionType: item.transactionType,
        totalAmount: new Decimal(item._sum.amount || 0),
        transactionCount: item._count.id
      }));
    } catch (error) {
      logger.error('Error fetching transactions by category:', error);
      throw error;
    }
  }

  /**
   * Publish transaction event to Kafka
   */
  private async publishTransactionEvent(eventType: string, transaction: any): Promise<void> {
    try {
      await producer.send({
        topic: 'financial-events',
        messages: [{
          key: transaction.id,
          value: JSON.stringify({
            eventType,
            transactionId: transaction.id,
            farmId: transaction.farmId,
            amount: transaction.amount.toString(),
            transactionType: transaction.transactionType,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
    } catch (error) {
      logger.warn('Failed to publish transaction event:', error);
    }
  }

  /**
   * Update budget allocations when transaction is created
   */
  private async updateBudgetOnTransaction(transaction: Transaction): Promise<void> {
    try {
      // Find active budget for the farm
      const activeBudget = await this.prisma.budget.findFirst({
        where: {
          farmId: transaction.farmId,
          status: 'ACTIVE'
        },
        include: {
          allocations: {
            where: { categoryId: transaction.categoryId }
          }
        }
      });

      if (activeBudget && activeBudget.allocations.length > 0) {
        const allocation = activeBudget.allocations[0];
        const newSpentAmount = allocation.spentAmount.add(transaction.amount);
        
        await this.prisma.budgetAllocation.update({
          where: { id: allocation.id },
          data: { spentAmount: newSpentAmount }
        });

        // Check if budget threshold exceeded
        const usagePercentage = newSpentAmount.div(allocation.allocatedAmount).mul(100);
        
        if (usagePercentage.gte(90)) {
          // Emit budget alert event
          await producer.send({
            topic: 'budget-alerts',
            messages: [{
              key: activeBudget.id,
              value: JSON.stringify({
                eventType: 'budget.threshold.exceeded',
                budgetId: activeBudget.id,
                farmId: transaction.farmId,
                categoryId: transaction.categoryId,
                usagePercentage: usagePercentage.toNumber(),
                timestamp: new Date().toISOString(),
              }),
            }],
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to update budget on transaction:', error);
    }
  }
}