import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { createError } from '../middleware/error-handler.middleware';

const router = Router();
const prisma = new PrismaClient();

// Get all categories
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { type, active = 'true' } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (active === 'true') where.isActive = true;

    const categories = await prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// Create category (admin only)
router.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      throw createError('Admin access required', 403);
    }

    const { name, description, type, color } = req.body;

    const category = await prisma.category.create({
      data: {
        id: uuidv4(),
        name,
        description,
        type,
        color,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

export default router;