import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { validationMiddleware, createTransactionSchema, updateTransactionSchema } from '../middleware/validation.middleware';
import { createError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';
import { producer, webSocketService, notificationService } from '../index';

const router = Router();
const prisma = new PrismaClient();

// Create transaction
router.post('/', validationMiddleware(createTransactionSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, categoryId, amount, transactionType, description, transactionDate, paymentMethod, vendorName, invoiceNumber, tags } = req.body;
    
    // Check if user has access to the farm
    if (!req.user?.farmIds?.includes(farmId)) {
      throw createError('Access denied to this farm', 403);
    }

    const transaction = await prisma.transaction.create({
      data: {
        id: uuidv4(),
        farmId,
        categoryId,
        amount: new Decimal(amount),
        transactionType,
        description,
        transactionDate: new Date(transactionDate),
        paymentMethod,
        vendorName,
        invoiceNumber,
        tags: tags || [],
        userId: req.user.id,
      },
      include: {
        category: true,
        farm: {
          select: { id: true, name: true }
        }
      }
    });

    // Emit Kafka event
    await producer.send({
      topic: 'financial-events',
      messages: [{
        key: transaction.id,
        value: JSON.stringify({
          eventType: 'transaction.created',
          transactionId: transaction.id,
          farmId: transaction.farmId,
          amount: transaction.amount.toString(),
          transactionType: transaction.transactionType,
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    // Send real-time update via WebSocket
    webSocketService.broadcastTransactionCreated(transaction);

    // Send notification
    await notificationService.notifyTransactionCreated(transaction);

    logger.info(`Transaction created: ${transaction.id} for farm ${farmId}`);

    res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// Get transactions with filtering
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { 
      farmId, 
      categoryId, 
      transactionType, 
      startDate, 
      endDate, 
      page = '1', 
      limit = '20',
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};
    
    if (farmId && req.user?.farmIds?.includes(farmId as string)) {
      where.farmId = farmId;
    } else if (req.user?.farmIds?.length) {
      where.farmId = { in: req.user.farmIds };
    } else {
      throw createError('No accessible farms found', 403);
    }

    if (categoryId) where.categoryId = categoryId;
    if (transactionType) where.transactionType = transactionType;
    
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate as string);
      if (endDate) where.transactionDate.lte = new Date(endDate as string);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          farm: {
            select: { id: true, name: true }
          }
        },
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: transactions,
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

// Get transaction by ID
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        farm: {
          select: { id: true, name: true }
        }
      }
    });

    if (!transaction) {
      throw createError('Transaction not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(transaction.farmId)) {
      throw createError('Access denied to this transaction', 403);
    }

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// Update transaction
router.put('/:id', validationMiddleware(updateTransactionSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      throw createError('Transaction not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(existingTransaction.farmId)) {
      throw createError('Access denied to this transaction', 403);
    }

    // Convert amount to Decimal if provided
    if (updateData.amount) {
      updateData.amount = new Decimal(updateData.amount);
    }

    if (updateData.transactionDate) {
      updateData.transactionDate = new Date(updateData.transactionDate);
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        farm: {
          select: { id: true, name: true }
        }
      }
    });

    // Emit Kafka event
    await producer.send({
      topic: 'financial-events',
      messages: [{
        key: transaction.id,
        value: JSON.stringify({
          eventType: 'transaction.updated',
          transactionId: transaction.id,
          farmId: transaction.farmId,
          amount: transaction.amount.toString(),
          transactionType: transaction.transactionType,
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    // Send real-time update via WebSocket
    webSocketService.broadcastTransactionUpdate(transaction);

    logger.info(`Transaction updated: ${transaction.id}`);

    res.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
});

// Delete transaction
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      throw createError('Transaction not found', 404);
    }

    // Check access
    if (!req.user?.farmIds?.includes(existingTransaction.farmId)) {
      throw createError('Access denied to this transaction', 403);
    }

    await prisma.transaction.delete({
      where: { id },
    });

    // Emit Kafka event
    await producer.send({
      topic: 'financial-events',
      messages: [{
        key: id,
        value: JSON.stringify({
          eventType: 'transaction.deleted',
          transactionId: id,
          farmId: existingTransaction.farmId,
          timestamp: new Date().toISOString(),
        }),
      }],
    });

    // Send real-time update via WebSocket
    webSocketService.broadcastTransactionDeleted(id, existingTransaction.farmId);

    logger.info(`Transaction deleted: ${id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get transaction summary
router.get('/summary/stats', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, startDate, endDate } = req.query;

    const where: any = {};
    
    if (farmId && req.user?.farmIds?.includes(farmId as string)) {
      where.farmId = farmId;
    } else if (req.user?.farmIds?.length) {
      where.farmId = { in: req.user.farmIds };
    } else {
      throw createError('No accessible farms found', 403);
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate as string);
      if (endDate) where.transactionDate.lte = new Date(endDate as string);
    }

    const [income, expenses, totalTransactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, transactionType: 'income' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { ...where, transactionType: 'expense' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalIncome = income._sum.amount || new Decimal(0);
    const totalExpenses = expenses._sum.amount || new Decimal(0);
    const netProfit = totalIncome.minus(totalExpenses);

    res.json({
      success: true,
      data: {
        totalIncome: totalIncome.toString(),
        totalExpenses: totalExpenses.toString(),
        netProfit: netProfit.toString(),
        totalTransactions,
        incomeTransactions: income._count,
        expenseTransactions: expenses._count,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;