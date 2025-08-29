import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './error-handler.middleware';

export const validationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(createError(`Validation error: ${errorMessage}`, 400));
    }
    
    next();
  };
};

// Transaction validation schemas
export const createTransactionSchema = Joi.object({
  farmId: Joi.string().uuid().required(),
  categoryId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).required(),
  transactionType: Joi.string().valid('income', 'expense').required(),
  description: Joi.string().min(1).max(500).required(),
  transactionDate: Joi.date().max('now').required(),
  paymentMethod: Joi.string().valid(
    'cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'other'
  ).optional(),
  vendorName: Joi.string().max(255).optional(),
  invoiceNumber: Joi.string().max(100).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});

export const updateTransactionSchema = Joi.object({
  categoryId: Joi.string().uuid().optional(),
  amount: Joi.number().positive().precision(2).optional(),
  transactionType: Joi.string().valid('income', 'expense').optional(),
  description: Joi.string().min(1).max(500).optional(),
  transactionDate: Joi.date().max('now').optional(),
  paymentMethod: Joi.string().valid(
    'cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'other'
  ).optional(),
  vendorName: Joi.string().max(255).optional(),
  invoiceNumber: Joi.string().max(100).optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
});

// Budget validation schemas
export const createBudgetSchema = Joi.object({
  farmId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  totalBudget: Joi.number().positive().precision(2).required(),
  categories: Joi.array().items(
    Joi.object({
      categoryId: Joi.string().uuid().required(),
      allocatedAmount: Joi.number().positive().precision(2).required(),
    })
  ).min(1).required(),
});

export const updateBudgetSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  totalBudget: Joi.number().positive().precision(2).optional(),
  status: Joi.string().valid('active', 'inactive', 'completed').optional(),
  categories: Joi.array().items(
    Joi.object({
      categoryId: Joi.string().uuid().required(),
      allocatedAmount: Joi.number().positive().precision(2).required(),
    })
  ).optional(),
});