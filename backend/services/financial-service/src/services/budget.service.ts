import { PrismaClient, Budget, BudgetAllocation } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { producer } from '../index';
import { logger } from '../utils/logger';

export interface CreateBudgetData {
  farmId: string;
  name: string;
  description?: string;
  totalBudget: number;
  seasonYear: number;
  startDate: Date;
  endDate: Date;
  userId: string;
  allocations: BudgetAllocationData[];
}

export interface BudgetAllocationData {
  categoryId: string;
  allocatedAmount: number;
  description?: string;
}

export interface UpdateBudgetData {
  name?: string;
  description?: string;
  totalBudget?: number;
  startDate?: Date;
  endDate?: Date;
  allocations?: BudgetAllocationData[];
}

export interface BudgetStatus {
  budgetId: string;
  totalBudget: Decimal;
  totalAllocated: Decimal;
  totalSpent: Decimal;
  remainingBudget: Decimal;
  usagePercentage: Decimal;
  allocations: AllocationStatus[];
}

export interface AllocationStatus {
  categoryId: string;
  categoryName: string;
  allocatedAmount: Decimal;
  spentAmount: Decimal;
  remainingAmount: Decimal;
  usagePercentage: Decimal;
}

/**
 * Budget Service
 * Handles all budget-related business logic
 */
export class BudgetService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new budget with allocations
   */
  async createBudget(data: CreateBudgetData): Promise<Budget> {
    try {
      const budget = await this.prisma.$transaction(async (tx) => {
        // Create the budget
        const createdBudget = await tx.budget.create({
          data: {
            farmId: data.farmId,
            name: data.name,
            description: data.description,
            totalBudget: new Decimal(data.totalBudget),
            seasonYear: data.seasonYear,
            startDate: data.startDate,
            endDate: data.endDate,
            status: 'DRAFT',
            userId: data.userId,
          }
        });

        // Create allocations
        if (data.allocations && data.allocations.length > 0) {
          await tx.budgetAllocation.createMany({
            data: data.allocations.map(allocation => ({
              budgetId: createdBudget.id,
              categoryId: allocation.categoryId,
              allocatedAmount: new Decimal(allocation.allocatedAmount),
              spentAmount: new Decimal(0),
              description: allocation.description,
            }))
          });
        }

        return createdBudget;
      });

      // Emit event
      await this.publishBudgetEvent('budget.created', budget);

      logger.info(`Budget created: ${budget.id}`);
      return budget;
    } catch (error) {
      logger.error('Error creating budget:', error);
      throw error;
    }
  }

  /**
   * Get budgets with filters
   */
  async getBudgets(
    farmId: string,
    status?: string,
    seasonYear?: number,
    page: number = 1,
    limit: number = 20
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = { farmId };
      
      if (status) where.status = status;
      if (seasonYear) where.seasonYear = seasonYear;

      const [budgets, total] = await Promise.all([
        this.prisma.budget.findMany({
          where,
          include: {
            allocations: {
              include: {
                category: true
              }
            },
            farm: {
              select: { id: true, name: true }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.budget.count({ where }),
      ]);

      return {
        budgets,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      logger.error('Error fetching budgets:', error);
      throw error;
    }
  }

  /**
   * Get budget by ID
   */
  async getBudgetById(id: string): Promise<Budget | null> {
    try {
      return await this.prisma.budget.findUnique({
        where: { id },
        include: {
          allocations: {
            include: {
              category: true
            }
          },
          farm: {
            select: { id: true, name: true }
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching budget:', error);
      throw error;
    }
  }

  /**
   * Update budget
   */
  async updateBudget(id: string, data: UpdateBudgetData): Promise<Budget> {
    try {
      const budget = await this.prisma.$transaction(async (tx) => {
        const updateData: any = { ...data };
        
        if (data.totalBudget) {
          updateData.totalBudget = new Decimal(data.totalBudget);
        }

        // Update budget
        const updatedBudget = await tx.budget.update({
          where: { id },
          data: updateData
        });

        // Update allocations if provided
        if (data.allocations) {
          // Delete existing allocations
          await tx.budgetAllocation.deleteMany({
            where: { budgetId: id }
          });

          // Create new allocations
          await tx.budgetAllocation.createMany({
            data: data.allocations.map(allocation => ({
              budgetId: id,
              categoryId: allocation.categoryId,
              allocatedAmount: new Decimal(allocation.allocatedAmount),
              spentAmount: new Decimal(0),
              description: allocation.description,
            }))
          });
        }

        return updatedBudget;
      });

      // Emit event
      await this.publishBudgetEvent('budget.updated', budget);

      logger.info(`Budget updated: ${budget.id}`);
      return budget;
    } catch (error) {
      logger.error('Error updating budget:', error);
      throw error;
    }
  }

  /**
   * Update budget status
   */
  async updateBudgetStatus(id: string, status: string): Promise<Budget> {
    try {
      const budget = await this.prisma.budget.update({
        where: { id },
        data: { status }
      });

      // Emit event
      await this.publishBudgetEvent('budget.status.updated', budget);

      logger.info(`Budget status updated: ${budget.id} -> ${status}`);
      return budget;
    } catch (error) {
      logger.error('Error updating budget status:', error);
      throw error;
    }
  }

  /**
   * Delete budget
   */
  async deleteBudget(id: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete allocations first
        await tx.budgetAllocation.deleteMany({
          where: { budgetId: id }
        });

        // Delete budget
        await tx.budget.delete({
          where: { id }
        });
      });

      // Emit event
      await this.publishBudgetEvent('budget.deleted', { id });

      logger.info(`Budget deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting budget:', error);
      throw error;
    }
  }

  /**
   * Get budget status with spending analysis
   */
  async getBudgetStatus(id: string): Promise<BudgetStatus> {
    try {
      const budget = await this.prisma.budget.findUnique({
        where: { id },
        include: {
          allocations: {
            include: {
              category: true
            }
          }
        }
      });

      if (!budget) {
        throw new Error('Budget not found');
      }

      const totalAllocated = budget.allocations.reduce(
        (sum, allocation) => sum.add(allocation.allocatedAmount),
        new Decimal(0)
      );

      const totalSpent = budget.allocations.reduce(
        (sum, allocation) => sum.add(allocation.spentAmount),
        new Decimal(0)
      );

      const remainingBudget = budget.totalBudget.minus(totalSpent);
      const usagePercentage = budget.totalBudget.gt(0) 
        ? totalSpent.div(budget.totalBudget).mul(100)
        : new Decimal(0);

      const allocations: AllocationStatus[] = budget.allocations.map(allocation => {
        const remainingAmount = allocation.allocatedAmount.minus(allocation.spentAmount);
        const allocationUsagePercentage = allocation.allocatedAmount.gt(0)
          ? allocation.spentAmount.div(allocation.allocatedAmount).mul(100)
          : new Decimal(0);

        return {
          categoryId: allocation.categoryId,
          categoryName: allocation.category.name,
          allocatedAmount: allocation.allocatedAmount,
          spentAmount: allocation.spentAmount,
          remainingAmount,
          usagePercentage: allocationUsagePercentage
        };
      });

      return {
        budgetId: budget.id,
        totalBudget: budget.totalBudget,
        totalAllocated,
        totalSpent,
        remainingBudget,
        usagePercentage,
        allocations
      };
    } catch (error) {
      logger.error('Error calculating budget status:', error);
      throw error;
    }
  }

  /**
   * Get active budget for a farm
   */
  async getActiveBudget(farmId: string): Promise<Budget | null> {
    try {
      return await this.prisma.budget.findFirst({
        where: {
          farmId,
          status: 'ACTIVE'
        },
        include: {
          allocations: {
            include: {
              category: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching active budget:', error);
      throw error;
    }
  }

  /**
   * Get budget comparison between periods
   */
  async getBudgetComparison(farmId: string, currentYear: number, previousYear?: number) {
    try {
      const compareYear = previousYear || currentYear - 1;

      const [currentBudget, previousBudget] = await Promise.all([
        this.prisma.budget.findFirst({
          where: { farmId, seasonYear: currentYear },
          include: { allocations: { include: { category: true } } }
        }),
        this.prisma.budget.findFirst({
          where: { farmId, seasonYear: compareYear },
          include: { allocations: { include: { category: true } } }
        })
      ]);

      return {
        currentYear,
        previousYear: compareYear,
        currentBudget,
        previousBudget,
        comparison: currentBudget && previousBudget ? {
          totalBudgetChange: currentBudget.totalBudget.minus(previousBudget.totalBudget),
          totalBudgetChangePercentage: previousBudget.totalBudget.gt(0)
            ? currentBudget.totalBudget.minus(previousBudget.totalBudget)
                .div(previousBudget.totalBudget).mul(100)
            : new Decimal(0)
        } : null
      };
    } catch (error) {
      logger.error('Error comparing budgets:', error);
      throw error;
    }
  }

  /**
   * Publish budget event to Kafka
   */
  private async publishBudgetEvent(eventType: string, budget: any): Promise<void> {
    try {
      await producer.send({
        topic: 'financial-events',
        messages: [{
          key: budget.id,
          value: JSON.stringify({
            eventType,
            budgetId: budget.id,
            farmId: budget.farmId,
            totalBudget: budget.totalBudget?.toString(),
            status: budget.status,
            timestamp: new Date().toISOString(),
          }),
        }],
      });
    } catch (error) {
      logger.warn('Failed to publish budget event:', error);
    }
  }
}