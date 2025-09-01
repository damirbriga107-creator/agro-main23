import { Pool } from 'pg';
import { SeedData } from '../../src/types';

export const seed: SeedData = {
  name: 'Default Transaction Categories',
  priority: 1,
  
  async execute(): Promise<void> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.FINANCIAL_DATABASE_URL
    });

    try {
      await pool.query('BEGIN');

      // Income categories
      const incomeCategories = [
        {
          name: 'Crop Sales',
          description: 'Revenue from selling crops',
          type: 'INCOME',
          color: '#10B981',
          icon: 'crop'
        },
        {
          name: 'Livestock Sales',
          description: 'Revenue from selling livestock',
          type: 'INCOME',
          color: '#059669',
          icon: 'livestock'
        },
        {
          name: 'Dairy Products',
          description: 'Revenue from dairy products',
          type: 'INCOME',
          color: '#0D9488',
          icon: 'milk'
        },
        {
          name: 'Government Subsidies',
          description: 'Government subsidy payments',
          type: 'INCOME',
          color: '#0891B2',
          icon: 'government'
        },
        {
          name: 'Insurance Claims',
          description: 'Insurance claim payments',
          type: 'INCOME',
          color: '#0284C7',
          icon: 'insurance'
        },
        {
          name: 'Equipment Rental',
          description: 'Revenue from renting out equipment',
          type: 'INCOME',
          color: '#2563EB',
          icon: 'equipment'
        },
        {
          name: 'Land Rental',
          description: 'Revenue from renting out land',
          type: 'INCOME',
          color: '#7C3AED',
          icon: 'land'
        },
        {
          name: 'Other Income',
          description: 'Other miscellaneous income',
          type: 'INCOME',
          color: '#9333EA',
          icon: 'other'
        }
      ];

      // Expense categories
      const expenseCategories = [
        {
          name: 'Seeds & Plants',
          description: 'Cost of seeds and plants',
          type: 'EXPENSE',
          color: '#DC2626',
          icon: 'seed'
        },
        {
          name: 'Fertilizers',
          description: 'Cost of fertilizers and soil amendments',
          type: 'EXPENSE',
          color: '#EA580C',
          icon: 'fertilizer'
        },
        {
          name: 'Pesticides & Herbicides',
          description: 'Cost of pesticides and herbicides',
          type: 'EXPENSE',
          color: '#D97706',
          icon: 'pesticide'
        },
        {
          name: 'Feed',
          description: 'Animal feed costs',
          type: 'EXPENSE',
          color: '#CA8A04',
          icon: 'feed'
        },
        {
          name: 'Fuel',
          description: 'Fuel costs for equipment and vehicles',
          type: 'EXPENSE',
          color: '#65A30D',
          icon: 'fuel'
        },
        {
          name: 'Equipment Purchase',
          description: 'Purchase of new equipment',
          type: 'EXPENSE',
          color: '#16A34A',
          icon: 'equipment-purchase'
        },
        {
          name: 'Equipment Maintenance',
          description: 'Equipment maintenance and repairs',
          type: 'EXPENSE',
          color: '#059669',
          icon: 'maintenance'
        },
        {
          name: 'Labor',
          description: 'Labor costs including wages and benefits',
          type: 'EXPENSE',
          color: '#0891B2',
          icon: 'labor'
        },
        {
          name: 'Utilities',
          description: 'Electricity, water, and other utilities',
          type: 'EXPENSE',
          color: '#0284C7',
          icon: 'utilities'
        },
        {
          name: 'Insurance',
          description: 'Insurance premiums',
          type: 'EXPENSE',
          color: '#2563EB',
          icon: 'insurance'
        },
        {
          name: 'Property Taxes',
          description: 'Property and land taxes',
          type: 'EXPENSE',
          color: '#7C3AED',
          icon: 'tax'
        },
        {
          name: 'Professional Services',
          description: 'Veterinary, legal, accounting services',
          type: 'EXPENSE',
          color: '#9333EA',
          icon: 'professional'
        },
        {
          name: 'Transportation',
          description: 'Transportation and shipping costs',
          type: 'EXPENSE',
          color: '#C2410C',
          icon: 'transport'
        },
        {
          name: 'Storage & Warehousing',
          description: 'Storage and warehousing costs',
          type: 'EXPENSE',
          color: '#DC2626',
          icon: 'storage'
        },
        {
          name: 'Marketing & Sales',
          description: 'Marketing and sales expenses',
          type: 'EXPENSE',
          color: '#BE185D',
          icon: 'marketing'
        },
        {
          name: 'Office Supplies',
          description: 'Office supplies and administrative costs',
          type: 'EXPENSE',
          color: '#BE123C',
          icon: 'office'
        }
      ];

      // Insert income categories
      for (const category of incomeCategories) {
        await pool.query(`
          INSERT INTO categories (name, description, type, color, icon)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO NOTHING
        `, [category.name, category.description, category.type, category.color, category.icon]);
      }

      // Insert expense categories
      for (const category of expenseCategories) {
        await pool.query(`
          INSERT INTO categories (name, description, type, color, icon)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO NOTHING
        `, [category.name, category.description, category.type, category.color, category.icon]);
      }

      // Create subcategories for some main categories
      const subcategories = [
        // Seeds & Plants subcategories
        { parent: 'Seeds & Plants', name: 'Corn Seeds', type: 'EXPENSE' },
        { parent: 'Seeds & Plants', name: 'Soybean Seeds', type: 'EXPENSE' },
        { parent: 'Seeds & Plants', name: 'Wheat Seeds', type: 'EXPENSE' },
        { parent: 'Seeds & Plants', name: 'Vegetable Seeds', type: 'EXPENSE' },
        
        // Fertilizers subcategories
        { parent: 'Fertilizers', name: 'Nitrogen Fertilizer', type: 'EXPENSE' },
        { parent: 'Fertilizers', name: 'Phosphorus Fertilizer', type: 'EXPENSE' },
        { parent: 'Fertilizers', name: 'Potassium Fertilizer', type: 'EXPENSE' },
        { parent: 'Fertilizers', name: 'Organic Fertilizer', type: 'EXPENSE' },
        
        // Labor subcategories
        { parent: 'Labor', name: 'Seasonal Workers', type: 'EXPENSE' },
        { parent: 'Labor', name: 'Full-time Employees', type: 'EXPENSE' },
        { parent: 'Labor', name: 'Contract Labor', type: 'EXPENSE' },
        
        // Crop Sales subcategories
        { parent: 'Crop Sales', name: 'Corn Sales', type: 'INCOME' },
        { parent: 'Crop Sales', name: 'Soybean Sales', type: 'INCOME' },
        { parent: 'Crop Sales', name: 'Wheat Sales', type: 'INCOME' },
        { parent: 'Crop Sales', name: 'Vegetable Sales', type: 'INCOME' }
      ];

      for (const subcategory of subcategories) {
        // Get parent category ID
        const parentResult = await pool.query(
          'SELECT id FROM categories WHERE name = $1',
          [subcategory.parent]
        );

        if (parentResult.rows.length > 0) {
          const parentId = parentResult.rows[0].id;
          
          await pool.query(`
            INSERT INTO categories (name, type, parent_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (name) DO NOTHING
          `, [subcategory.name, subcategory.type, parentId]);
        }
      }

      await pool.query('COMMIT');
      console.log('✅ Default transaction categories seeded successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  }
};