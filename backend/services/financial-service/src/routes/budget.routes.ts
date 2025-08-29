import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { validationMiddleware, createBudgetSchema, updateBudgetSchema } from '../middleware/validation.middleware';
import { createError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { producer } from '../index';

const router = Router();
const prisma = new PrismaClient();

// Create budget
router.post('/', validationMiddleware(createBudgetSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, name, description, startDate, endDate, totalBudget, categories } = req.body;
    
    // Check if user has access to the farm
    if (!req.user?.farmIds?.includes(farmId)) {
      throw createError('Access denied to this farm', 403);
    }

    // Validate that allocated amounts don't exceed total budget
    const totalAllocated = categories.reduce((sum: number, cat: any) => sum + cat.allocatedAmount, 0);
    if (totalAllocated > totalBudget) {
      throw createError('Total allocated amount cannot exceed total budget', 400);
    }

    const budget = await prisma.budget.create({
      data: {
        id: uuidv4(),
        farmId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalBudget: new Decimal(totalBudget),
        status: 'active',
        userId: req.user.id,
        categories: {
          create: categories.map((cat: any) => ({
            id: uuidv4(),
            categoryId: cat.categoryId,
            allocatedAmount: new Decimal(cat.allocatedAmount),
          }))
        }
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        farm: {
          select: { id: true, name: true }
        }
      }
    });

    // Emit Kafka event
    await producer.send({
      topic: 'financial-events',
      messages: [{
        key: budget.id,
        value: JSON.stringify({
          eventType: 'budget.created',
          budgetId: budget.id,
          farmId: budget.farmId,
          totalBudget: budget.totalBudget.toString(),
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    logger.info(`Budget created: ${budget.id} for farm ${farmId}`);

    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
});

// Get budgets
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, status, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    
    if (farmId && req.user?.farmIds?.includes(farmId as string)) {
      where.farmId = farmId;
    } else if (req.user?.farmIds?.length) {
      where.farmId = { in: req.user.farmIds };
    } else {
      throw createError('No accessible farms found', 403);
    }

    if (status) where.status = status;

    const [budgets, total] = await Promise.all([
      prisma.budget.findMany({
        where,
        include: {
          categories: {
            include: {
              category: true
            }
          },
          farm: {
            select: { id: true, name: true }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.budget.count({ where }),
    ]);

    res.json({
      success: true,
      data: budgets,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get budget by ID
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        farm: {
          select: { id: true, name: true }
        }
      }
    });

    if (!budget) {
      throw createError('Budget not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(budget.farmId)) {
      throw createError('Access denied to this budget', 403);
    }

    res.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
});

// Update budget
router.put('/:id', validationMiddleware(updateBudgetSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existingBudget) {
      throw createError('Budget not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(existingBudget.farmId)) {
      throw createError('Access denied to this budget', 403);
    }

    // Convert dates and amounts
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.totalBudget) updateData.totalBudget = new Decimal(updateData.totalBudget);

    // Handle categories update
    if (updateData.categories) {
      // Delete existing categories and create new ones
      await prisma.budgetCategory.deleteMany({
        where: { budgetId: id }
      });
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: {
        ...updateData,
        ...(updateData.categories && {
          categories: {
            create: updateData.categories.map((cat: any) => ({
              id: uuidv4(),
              categoryId: cat.categoryId,
              allocatedAmount: new Decimal(cat.allocatedAmount),
            }))
          }
        })
      },
      include: {
        categories: {
          include: {
            category: true
          }
        },
        farm: {
          select: { id: true, name: true }
        }
      }
    });

    // Emit Kafka event
    await producer.send({
      topic: 'financial-events',
      messages: [{
        key: budget.id,
        value: JSON.stringify({
          eventType: 'budget.updated',
          budgetId: budget.id,
          farmId: budget.farmId,
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    logger.info(`Budget updated: ${budget.id}`);

    res.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    next(error);
  }
});

// Delete budget
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingBudget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!existingBudget) {
      throw createError('Budget not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(existingBudget.farmId)) {
      throw createError('Access denied to this budget', 403);
    }

    // Delete categories first, then budget
    await prisma.budgetCategory.deleteMany({
      where: { budgetId: id }
    });

    await prisma.budget.delete({
      where: { id },
    });

    // Emit Kafka event
    await producer.send({
      topic: 'financial-events',
      messages: [{
        key: id,
        value: JSON.stringify({
          eventType: 'budget.deleted',
          budgetId: id,
          farmId: existingBudget.farmId,
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    logger.info(`Budget deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get budget vs actual analysis
router.get('/:id/analysis', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    if (!budget) {
      throw createError('Budget not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(budget.farmId)) {
      throw createError('Access denied to this budget', 403);
    }

    // Get actual spending for each category
    const actualSpending = await prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        farmId: budget.farmId,
        transactionType: 'expense',
        transactionDate: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Combine budget and actual data
    const analysis = budget.categories.map(budgetCat => {
      const actual = actualSpending.find(a => a.categoryId === budgetCat.categoryId);
      const actualAmount = actual?._sum.amount || new Decimal(0);
      const variance = budgetCat.allocatedAmount.minus(actualAmount);
      const percentUsed = budgetCat.allocatedAmount.gt(0) 
        ? actualAmount.div(budgetCat.allocatedAmount).mul(100)
        : new Decimal(0);

      return {
        category: budgetCat.category,
        allocated: budgetCat.allocatedAmount.toString(),
        actual: actualAmount.toString(),
        variance: variance.toString(),
        percentUsed: percentUsed.toFixed(2),
        status: variance.gte(0) ? 'under_budget' : 'over_budget',
      };
    });

    res.json({
      success: true,
      data: {
        budget: {
          id: budget.id,
          name: budget.name,
          totalBudget: budget.totalBudget.toString(),
          startDate: budget.startDate,
          endDate: budget.endDate,
        },
        categoryAnalysis: analysis,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;