import { Router } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error-handler.middleware';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Profit & Loss Report
router.get('/profit-loss', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, startDate, endDate, groupBy = 'month' } = req.query;

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

    // Get income and expenses by category
    const [incomeData, expenseData] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...where, transactionType: 'income' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...where, transactionType: 'expense' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // Get category details
    const categoryIds = [...new Set([
      ...incomeData.map(d => d.categoryId),
      ...expenseData.map(d => d.categoryId),
    ])];

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    // Format income data
    const income = incomeData.map(item => {
      const category = categories.find(c => c.id === item.categoryId);
      return {
        categoryId: item.categoryId,
        categoryName: category?.name || 'Unknown',
        amount: item._sum.amount?.toString() || '0',
        transactionCount: item._count,
      };
    });

    // Format expense data
    const expenses = expenseData.map(item => {
      const category = categories.find(c => c.id === item.categoryId);
      return {
        categoryId: item.categoryId,
        categoryName: category?.name || 'Unknown',
        amount: item._sum.amount?.toString() || '0',
        transactionCount: item._count,
      };
    });

    // Calculate totals
    const totalIncome = incomeData.reduce((sum, item) => 
      sum.plus(item._sum.amount || 0), new Decimal(0));
    const totalExpenses = expenseData.reduce((sum, item) => 
      sum.plus(item._sum.amount || 0), new Decimal(0));
    const netProfit = totalIncome.minus(totalExpenses);

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        summary: {
          totalIncome: totalIncome.toString(),
          totalExpenses: totalExpenses.toString(),
          netProfit: netProfit.toString(),
          profitMargin: totalIncome.gt(0) ? netProfit.div(totalIncome).mul(100).toFixed(2) + '%' : '0%',
        },
        income,
        expenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cash Flow Report
router.get('/cash-flow', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, startDate, endDate, groupBy = 'month' } = req.query;

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

    // Group by time period (month/week/day)
    let dateFormat: string;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      case 'month':
      default:
        dateFormat = '%Y-%m';
        break;
    }

    // Raw SQL query for date grouping (PostgreSQL specific)
    const cashFlowData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("transactionDate", ${dateFormat}) as period,
        "transactionType",
        SUM("amount") as total_amount,
        COUNT(*) as transaction_count
      FROM "Transaction"
      WHERE ${where.farmId ? Prisma.sql`"farmId" = ANY(${where.farmId.in || [where.farmId]})` : Prisma.sql`1=1`}
        ${where.transactionDate?.gte ? Prisma.sql`AND "transactionDate" >= ${where.transactionDate.gte}` : Prisma.sql``}
        ${where.transactionDate?.lte ? Prisma.sql`AND "transactionDate" <= ${where.transactionDate.lte}` : Prisma.sql``}
      GROUP BY period, "transactionType"
      ORDER BY period ASC
    ` as any[];

    // Process the data
    const periods = [...new Set(cashFlowData.map(item => item.period))].sort();
    
    const formattedData = periods.map(period => {
      const periodIncome = cashFlowData.find(item => 
        item.period === period && item.transactionType === 'income'
      );
      const periodExpenses = cashFlowData.find(item => 
        item.period === period && item.transactionType === 'expense'
      );

      const income = new Decimal(periodIncome?.total_amount || 0);
      const expenses = new Decimal(periodExpenses?.total_amount || 0);
      const netCashFlow = income.minus(expenses);

      return {
        period,
        income: income.toString(),
        expenses: expenses.toString(),
        netCashFlow: netCashFlow.toString(),
        incomeTransactions: periodIncome?.transaction_count || 0,
        expenseTransactions: periodExpenses?.transaction_count || 0,
      };
    });

    // Calculate running balance
    let runningBalance = new Decimal(0);
    const dataWithBalance = formattedData.map(item => {
      runningBalance = runningBalance.plus(item.netCashFlow);
      return {
        ...item,
        cumulativeBalance: runningBalance.toString(),
      };
    });

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
          groupBy,
        },
        cashFlow: dataWithBalance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Budget Analysis Report
router.get('/budget-analysis', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, budgetId } = req.query;

    const where: any = {};
    
    if (farmId && req.user?.farmIds?.includes(farmId as string)) {
      where.farmId = farmId;
    } else if (req.user?.farmIds?.length) {
      where.farmId = { in: req.user.farmIds };
    } else {
      throw createError('No accessible farms found', 403);
    }

    if (budgetId) {
      where.id = budgetId;
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        categories: {
          include: {
            category: true
          }
        }
      }
    });

    if (budgets.length === 0) {
      throw createError('No budgets found', 404);
    }

    const analysisResults = await Promise.all(budgets.map(async (budget) => {
      // Get actual spending for this budget period
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

      const categoryAnalysis = budget.categories.map(budgetCat => {
        const actual = actualSpending.find(a => a.categoryId === budgetCat.categoryId);
        const actualAmount = actual?._sum.amount || new Decimal(0);
        const variance = budgetCat.allocatedAmount.minus(actualAmount);
        const percentUsed = budgetCat.allocatedAmount.gt(0) 
          ? actualAmount.div(budgetCat.allocatedAmount).mul(100)
          : new Decimal(0);

        return {
          category: budgetCat.category.name,
          allocated: budgetCat.allocatedAmount.toString(),
          actual: actualAmount.toString(),
          variance: variance.toString(),
          percentUsed: parseFloat(percentUsed.toFixed(2)),
          status: variance.gte(0) ? 'under_budget' : 'over_budget',
        };
      });

      return {
        budgetId: budget.id,
        budgetName: budget.name,
        period: {
          startDate: budget.startDate,
          endDate: budget.endDate,
        },
        totalBudget: budget.totalBudget.toString(),
        categories: categoryAnalysis,
      };
    }));

    res.json({
      success: true,
      data: analysisResults,
    });
  } catch (error) {
    next(error);
  }
});

// Crop Profitability Report
router.get('/crop-profitability', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { farmId, startDate, endDate, cropId } = req.query;

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

    // Note: This assumes transactions are tagged with crop information
    // In a real implementation, you'd have a proper crop-transaction relationship
    let cropFilter = {};
    if (cropId) {
      cropFilter = { tags: { has: cropId } };
    }

    const [incomeByTag, expensesByTag] = await Promise.all([
      prisma.transaction.findMany({
        where: { 
          ...where, 
          ...cropFilter,
          transactionType: 'income' 
        },
        select: {
          amount: true,
          tags: true,
          description: true,
        },
      }),
      prisma.transaction.findMany({
        where: { 
          ...where, 
          ...cropFilter,
          transactionType: 'expense' 
        },
        select: {
          amount: true,
          tags: true,
          description: true,
        },
      }),
    ]);

    // Group by crop tags
    const cropProfitability: { [key: string]: any } = {};

    // Process income
    incomeByTag.forEach(transaction => {
      transaction.tags.forEach(tag => {
        if (!cropProfitability[tag]) {
          cropProfitability[tag] = {
            cropName: tag,
            income: new Decimal(0),
            expenses: new Decimal(0),
            transactionCount: 0,
          };
        }
        cropProfitability[tag].income = cropProfitability[tag].income.plus(transaction.amount);
        cropProfitability[tag].transactionCount++;
      });
    });

    // Process expenses
    expensesByTag.forEach(transaction => {
      transaction.tags.forEach(tag => {
        if (!cropProfitability[tag]) {
          cropProfitability[tag] = {
            cropName: tag,
            income: new Decimal(0),
            expenses: new Decimal(0),
            transactionCount: 0,
          };
        }
        cropProfitability[tag].expenses = cropProfitability[tag].expenses.plus(transaction.amount);
        cropProfitability[tag].transactionCount++;
      });
    });

    // Calculate profitability
    const results = Object.values(cropProfitability).map((crop: any) => {
      const profit = crop.income.minus(crop.expenses);
      const margin = crop.income.gt(0) ? profit.div(crop.income).mul(100) : new Decimal(0);

      return {
        cropName: crop.cropName,
        income: crop.income.toString(),
        expenses: crop.expenses.toString(),
        profit: profit.toString(),
        profitMargin: parseFloat(margin.toFixed(2)),
        transactionCount: crop.transactionCount,
      };
    });

    res.json({
      success: true,
      data: {
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        crops: results.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;