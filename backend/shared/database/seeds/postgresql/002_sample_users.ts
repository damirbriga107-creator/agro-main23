import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { SeedData } from '../../src/types';

export const seed: SeedData = {
  name: 'Sample Users and Farms',
  priority: 2,
  
  async execute(): Promise<void> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL
    });

    try {
      await pool.query('BEGIN');

      // Create sample users
      const users = [
        {
          email: 'admin@daorsagro.com',
          firstName: 'System',
          lastName: 'Administrator',
          phone: '+1-555-0001',
          role: 'ADMIN',
          password: 'admin123'
        },
        {
          email: 'john.farmer@example.com',
          firstName: 'John',
          lastName: 'Farmer',
          phone: '+1-555-0101',
          role: 'FARMER',
          password: 'farmer123',
          bio: 'Third-generation corn and soybean farmer with 25 years of experience.',
          location: 'Iowa, USA'
        },
        {
          email: 'sarah.green@example.com',
          firstName: 'Sarah',
          lastName: 'Green',
          phone: '+1-555-0102',
          role: 'FARMER',
          password: 'farmer123',
          bio: 'Organic vegetable farmer focused on sustainable practices.',
          location: 'California, USA'
        },
        {
          email: 'mike.advisor@example.com',
          firstName: 'Mike',
          lastName: 'Johnson',
          phone: '+1-555-0201',
          role: 'ADVISOR',
          password: 'advisor123',
          bio: 'Agricultural advisor specializing in crop management and financial planning.',
          location: 'Illinois, USA'
        },
        {
          email: 'lisa.support@daorsagro.com',
          firstName: 'Lisa',
          lastName: 'Support',
          phone: '+1-555-0301',
          role: 'SUPPORT',
          password: 'support123'
        }
      ];

      const userIds: string[] = [];

      for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 12);
        
        const result = await pool.query(`
          INSERT INTO users (
            email, first_name, last_name, phone, password_hash, role, 
            email_verified, bio, location
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            bio = EXCLUDED.bio,
            location = EXCLUDED.location
          RETURNING id
        `, [
          user.email, user.firstName, user.lastName, user.phone,
          hashedPassword, user.role, true, user.bio || null, user.location || null
        ]);

        userIds.push(result.rows[0].id);
      }

      // Create sample farms
      const farms = [
        {
          name: 'Sunrise Corn Farm',
          description: 'Family-owned corn and soybean operation established in 1952',
          totalAcres: 1250.50,
          farmType: 'CROP',
          address: '1234 Farm Road',
          city: 'Des Moines',
          state: 'Iowa',
          country: 'USA',
          zipCode: '50309',
          latitude: 41.5868,
          longitude: -93.6250,
          certifications: ['Organic', 'Non-GMO'],
          ownerId: userIds[1] // John Farmer
        },
        {
          name: 'Green Valley Organic',
          description: 'Certified organic vegetable farm specializing in heirloom varieties',
          totalAcres: 85.25,
          farmType: 'CROP',
          address: '5678 Valley Lane',
          city: 'Salinas',
          state: 'California',
          country: 'USA',
          zipCode: '93901',
          latitude: 36.6777,
          longitude: -121.6555,
          certifications: ['USDA Organic', 'California Certified Organic Farmers'],
          ownerId: userIds[2] // Sarah Green
        },
        {
          name: 'Prairie Wind Dairy',
          description: 'Modern dairy operation with 200 Holstein cows',
          totalAcres: 450.75,
          farmType: 'DAIRY',
          address: '9012 Prairie Road',
          city: 'Madison',
          state: 'Wisconsin',
          country: 'USA',
          zipCode: '53703',
          latitude: 43.0731,
          longitude: -89.4012,
          certifications: ['Grade A Dairy'],
          ownerId: userIds[1] // John Farmer (second farm)
        }
      ];

      const farmIds: string[] = [];

      for (const farm of farms) {
        const result = await pool.query(`
          INSERT INTO farms (
            name, description, total_acres, farm_type, address, city, state, 
            country, zip_code, latitude, longitude, certifications
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            total_acres = EXCLUDED.total_acres,
            address = EXCLUDED.address
          RETURNING id
        `, [
          farm.name, farm.description, farm.totalAcres, farm.farmType,
          farm.address, farm.city, farm.state, farm.country, farm.zipCode,
          farm.latitude, farm.longitude, JSON.stringify(farm.certifications)
        ]);

        farmIds.push(result.rows[0].id);

        // Add farm owner as member
        await pool.query(`
          INSERT INTO farm_members (farm_id, user_id, role)
          VALUES ($1, $2, 'OWNER')
          ON CONFLICT (farm_id, user_id) DO NOTHING
        `, [result.rows[0].id, farm.ownerId]);
      }

      // Add advisor to farms
      const advisorId = userIds[3]; // Mike Johnson
      for (const farmId of farmIds) {
        await pool.query(`
          INSERT INTO farm_members (farm_id, user_id, role)
          VALUES ($1, $2, 'ADVISOR')
          ON CONFLICT (farm_id, user_id) DO NOTHING
        `, [farmId, advisorId]);
      }

      // Create sample crops
      const crops = [
        {
          farmId: farmIds[0], // Sunrise Corn Farm
          name: 'Corn',
          variety: 'Pioneer P1197AM',
          acres: 650.25,
          plantingDate: '2024-04-15',
          expectedHarvestDate: '2024-09-30',
          status: 'GROWING',
          seasonYear: 2024,
          expectedYield: 180.5,
          yieldUnit: 'bushels/acre'
        },
        {
          farmId: farmIds[0], // Sunrise Corn Farm
          name: 'Soybeans',
          variety: 'Asgrow AG2433',
          acres: 600.25,
          plantingDate: '2024-05-01',
          expectedHarvestDate: '2024-10-15',
          status: 'GROWING',
          seasonYear: 2024,
          expectedYield: 55.2,
          yieldUnit: 'bushels/acre'
        },
        {
          farmId: farmIds[1], // Green Valley Organic
          name: 'Tomatoes',
          variety: 'Cherokee Purple',
          acres: 25.5,
          plantingDate: '2024-03-15',
          expectedHarvestDate: '2024-08-30',
          status: 'HARVESTED',
          seasonYear: 2024,
          expectedYield: 25.0,
          actualYield: 28.5,
          yieldUnit: 'tons/acre'
        },
        {
          farmId: farmIds[1], // Green Valley Organic
          name: 'Lettuce',
          variety: 'Buttercrunch',
          acres: 15.75,
          plantingDate: '2024-02-01',
          expectedHarvestDate: '2024-05-15',
          status: 'SOLD',
          seasonYear: 2024,
          expectedYield: 12.0,
          actualYield: 13.2,
          yieldUnit: 'tons/acre'
        }
      ];

      for (const crop of crops) {
        await pool.query(`
          INSERT INTO crops (
            farm_id, name, variety, acres, planting_date, expected_harvest_date,
            actual_harvest_date, status, season_year, expected_yield, 
            actual_yield, yield_unit
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT DO NOTHING
        `, [
          crop.farmId, crop.name, crop.variety, crop.acres,
          crop.plantingDate, crop.expectedHarvestDate,
          crop.status === 'HARVESTED' || crop.status === 'SOLD' ? crop.expectedHarvestDate : null,
          crop.status, crop.seasonYear, crop.expectedYield,
          crop.actualYield || null, crop.yieldUnit
        ]);
      }

      // Create system settings
      const systemSettings = [
        {
          key: 'default_currency',
          value: JSON.stringify('USD'),
          category: 'financial'
        },
        {
          key: 'supported_currencies',
          value: JSON.stringify(['USD', 'CAD', 'EUR', 'GBP']),
          category: 'financial'
        },
        {
          key: 'default_timezone',
          value: JSON.stringify('America/Chicago'),
          category: 'system'
        },
        {
          key: 'notification_settings',
          value: JSON.stringify({
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            daily_summary: true,
            weekly_report: true
          }),
          category: 'notifications'
        },
        {
          key: 'backup_settings',
          value: JSON.stringify({
            enabled: true,
            frequency: 'daily',
            retention_days: 30
          }),
          category: 'system'
        }
      ];

      for (const setting of systemSettings) {
        await pool.query(`
          INSERT INTO system_settings (key, value, category)
          VALUES ($1, $2, $3)
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            category = EXCLUDED.category,
            updated_at = NOW()
        `, [setting.key, setting.value, setting.category]);
      }

      await pool.query('COMMIT');
      console.log('✅ Sample users and farms seeded successfully');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    } finally {
      await pool.end();
    }
  }
};