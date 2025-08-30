import { PrismaClient, Category } from '@prisma/client';
import { logger } from '../utils/logger';

export interface CreateCategoryData {
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string;
  type?: 'INCOME' | 'EXPENSE';
  parentId?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface CategoryWithStats {
  id: string;
  name: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  parentId?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  transactionCount: number;
  totalAmount: string;
  averageAmount: string;
  lastTransactionDate?: Date;
  children?: CategoryWithStats[];
}

/**
 * Category Service
 * Handles all category-related business logic
 */
export class CategoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new category
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    try {
      const category = await this.prisma.category.create({
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          parentId: data.parentId,
          color: data.color,
          icon: data.icon,
          isActive: true
        }
      });

      logger.info(`Category created: ${category.id} - ${category.name}`);
      return category;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw error;
    }
  }

  /**
   * Get all categories with optional filtering
   */
  async getCategories(
    type?: 'INCOME' | 'EXPENSE',
    includeInactive: boolean = false,
    includeStats: boolean = false
  ): Promise<Category[] | CategoryWithStats[]> {
    try {
      const where: any = {};
      if (type) where.type = type;
      if (!includeInactive) where.isActive = true;

      if (includeStats) {
        return await this.getCategoriesWithStats(where);
      }

      const categories = await this.prisma.category.findMany({
        where,
        include: {
          children: {
            where: includeInactive ? {} : { isActive: true }
          },
          parent: true
        },
        orderBy: [
          { type: 'asc' },
          { name: 'asc' }
        ]
      });

      return categories;
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string, includeStats: boolean = false): Promise<Category | CategoryWithStats | null> {
    try {
      if (includeStats) {
        const categoriesWithStats = await this.getCategoriesWithStats({ id });
        return categoriesWithStats[0] || null;
      }

      return await this.prisma.category.findUnique({
        where: { id },
        include: {
          children: true,
          parent: true
        }
      });
    } catch (error) {
      logger.error('Error fetching category:', error);
      throw error;
    }
  }

  /**
   * Update category
   */
  async updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
    try {
      const category = await this.prisma.category.update({
        where: { id },
        data
      });

      logger.info(`Category updated: ${category.id} - ${category.name}`);
      return category;
    } catch (error) {
      logger.error('Error updating category:', error);
      throw error;
    }
  }

  /**
   * Delete category (soft delete by setting isActive to false)
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      // Check if category has transactions
      const transactionCount = await this.prisma.transaction.count({
        where: { categoryId: id }
      });

      if (transactionCount > 0) {
        // Soft delete - set as inactive
        await this.prisma.category.update({
          where: { id },
          data: { isActive: false }
        });
        logger.info(`Category soft deleted (has transactions): ${id}`);
      } else {
        // Hard delete if no transactions
        await this.prisma.category.delete({
          where: { id }
        });
        logger.info(`Category hard deleted: ${id}`);
      }
    } catch (error) {
      logger.error('Error deleting category:', error);
      throw error;
    }
  }

  /**
   * Get category hierarchy (parent-child relationships)
   */
  async getCategoryHierarchy(type?: 'INCOME' | 'EXPENSE'): Promise<Category[]> {
    try {
      const where: any = { parentId: null, isActive: true };
      if (type) where.type = type;

      const rootCategories = await this.prisma.category.findMany({
        where,
        include: {
          children: {
            where: { isActive: true },
            include: {
              children: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      return rootCategories;
    } catch (error) {
      logger.error('Error fetching category hierarchy:', error);
      throw error;
    }
  }

  /**
   * Get categories with transaction statistics
   */
  private async getCategoriesWithStats(where: any): Promise<CategoryWithStats[]> {
    try {
      const categories = await this.prisma.category.findMany({
        where,
        include: {
          children: true,
          parent: true,
          _count: {
            select: { transactions: true }
          }
        }
      });

      const categoriesWithStats: CategoryWithStats[] = [];

      for (const category of categories) {
        // Get transaction statistics
        const transactionStats = await this.prisma.transaction.aggregate({
          where: { categoryId: category.id },
          _sum: { amount: true },
          _avg: { amount: true },
          _max: { transactionDate: true }
        });

        const totalAmount = transactionStats._sum.amount?.toString() || '0';
        const averageAmount = transactionStats._avg.amount?.toString() || '0';
        const lastTransactionDate = transactionStats._max.transactionDate;

        // Get children with stats if any
        const children: CategoryWithStats[] = [];
        if (category.children.length > 0) {
          const childrenWithStats = await this.getCategoriesWithStats({
            parentId: category.id
          });
          children.push(...childrenWithStats);
        }

        categoriesWithStats.push({
          id: category.id,
          name: category.name,
          description: category.description,
          type: category.type as 'INCOME' | 'EXPENSE',
          parentId: category.parentId,
          color: category.color,
          icon: category.icon,
          isActive: category.isActive,
          transactionCount: category._count.transactions,
          totalAmount,
          averageAmount,
          lastTransactionDate,
          children: children.length > 0 ? children : undefined
        });
      }

      return categoriesWithStats;
    } catch (error) {
      logger.error('Error fetching categories with stats:', error);
      throw error;
    }
  }

  /**
   * Get popular categories based on transaction count
   */
  async getPopularCategories(type?: 'INCOME' | 'EXPENSE', limit: number = 10): Promise<CategoryWithStats[]> {
    try {
      const where: any = { isActive: true };
      if (type) where.type = type;

      const categoriesWithStats = await this.getCategoriesWithStats(where);
      
      return categoriesWithStats
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error fetching popular categories:', error);
      throw error;
    }
  }

  /**
   * Search categories by name
   */
  async searchCategories(searchTerm: string, type?: 'INCOME' | 'EXPENSE'): Promise<Category[]> {
    try {
      const where: any = {
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        },
        isActive: true
      };
      
      if (type) where.type = type;

      return await this.prisma.category.findMany({
        where,
        include: {
          parent: true
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      logger.error('Error searching categories:', error);
      throw error;
    }
  }

  /**
   * Get default categories for initial setup
   */
  async createDefaultCategories(): Promise<void> {
    try {
      const defaultCategories = [
        // Income Categories
        { name: 'Crop Sales', type: 'INCOME', color: '#10B981', icon: '🌾' },
        { name: 'Livestock Sales', type: 'INCOME', color: '#10B981', icon: '🐄' },
        { name: 'Government Subsidies', type: 'INCOME', color: '#10B981', icon: '🏛️' },
        { name: 'Insurance Claims', type: 'INCOME', color: '#10B981', icon: '🛡️' },
        { name: 'Equipment Rental', type: 'INCOME', color: '#10B981', icon: '🚜' },
        { name: 'Other Income', type: 'INCOME', color: '#10B981', icon: '💰' },
        
        // Expense Categories
        { name: 'Seeds & Planting', type: 'EXPENSE', color: '#EF4444', icon: '🌱' },
        { name: 'Fertilizers', type: 'EXPENSE', color: '#EF4444', icon: '🧪' },
        { name: 'Pesticides & Chemicals', type: 'EXPENSE', color: '#EF4444', icon: '🧴' },
        { name: 'Equipment & Machinery', type: 'EXPENSE', color: '#EF4444', icon: '🚜' },
        { name: 'Labor Costs', type: 'EXPENSE', color: '#EF4444', icon: '👥' },
        { name: 'Fuel & Energy', type: 'EXPENSE', color: '#EF4444', icon: '⛽' },
        { name: 'Water & Irrigation', type: 'EXPENSE', color: '#EF4444', icon: '💧' },
        { name: 'Feed & Fodder', type: 'EXPENSE', color: '#EF4444', icon: '🌾' },
        { name: 'Veterinary & Health', type: 'EXPENSE', color: '#EF4444', icon: '🏥' },
        { name: 'Insurance Premiums', type: 'EXPENSE', color: '#EF4444', icon: '🛡️' },
        { name: 'Land Lease', type: 'EXPENSE', color: '#EF4444', icon: '🏞️' },
        { name: 'Transportation', type: 'EXPENSE', color: '#EF4444', icon: '🚛' },
        { name: 'Storage & Warehousing', type: 'EXPENSE', color: '#EF4444', icon: '🏭' },
        { name: 'Administrative Costs', type: 'EXPENSE', color: '#EF4444', icon: '📋' },
        { name: 'Other Expenses', type: 'EXPENSE', color: '#EF4444', icon: '💸' }
      ];

      for (const categoryData of defaultCategories) {
        const exists = await this.prisma.category.findFirst({
          where: { name: categoryData.name }
        });

        if (!exists) {
          await this.prisma.category.create({
            data: {
              ...categoryData,
              description: `Default ${categoryData.type.toLowerCase()} category for ${categoryData.name.toLowerCase()}`,
              isActive: true
            } as any
          });
        }
      }

      logger.info('Default categories created successfully');
    } catch (error) {
      logger.error('Error creating default categories:', error);
      throw error;
    }
  }
}