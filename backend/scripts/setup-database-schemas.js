#!/usr/bin/env node

/**
 * Database Schema Setup Script
 * Sets up MongoDB collections and indexes for all dashboard services
 */

const { MongoClient } = require('mongodb');
const chalk = require('chalk');

// Configuration
const config = {
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017',
  databases: {
    analytics: process.env.ANALYTICS_DB || 'agro_analytics',
    iot: process.env.IOT_DB || 'agro_iot',
    weather: process.env.WEATHER_DB || 'agro_weather',
    financial: process.env.FINANCIAL_DB || 'agro_financial'
  }
};

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  header: (msg) => console.log(chalk.bold.cyan('\n' + msg))
};

// Analytics Service Schema Setup
async function setupAnalyticsSchema(client) {
  log.header('Setting up Analytics Service Database');
  
  const db = client.db(config.databases.analytics);
  
  try {
    // Dashboard Metrics Collection
    const metricsCollection = db.collection('dashboard_metrics');
    await metricsCollection.createIndexes([
      { key: { userId: 1, 'period.startDate': -1 } },
      { key: { farmId: 1, 'period.startDate': -1 } },
      { key: { 'period.type': 1, 'period.startDate': -1 } },
      { key: { createdAt: -1 } }
    ]);
    log.success('Dashboard metrics collection and indexes created');

    // KPIs Collection
    const kpisCollection = db.collection('kpis');
    await kpisCollection.createIndexes([
      { key: { userId: 1, kpiType: 1, 'period.startDate': -1 } },
      { key: { farmId: 1, kpiType: 1, 'period.startDate': -1 } },
      { key: { name: 1, 'period.startDate': -1 } },
      { key: { createdAt: -1 } }
    ]);
    log.success('KPIs collection and indexes created');

    // Insert sample data
    const sampleMetrics = {
      userId: 'user123',
      farmId: 'farm123',
      metrics: {
        financial: {
          totalRevenue: 125000,
          totalExpenses: 85000,
          netProfit: 40000,
          revenueChange: 12.5,
          expenseChange: 8.3,
          profitChange: 18.7
        },
        production: {
          totalYield: 2500,
          totalArea: 100,
          yieldPerHectare: 25,
          yieldChange: 15.2,
          areaChange: 5.0,
          productivityChange: 10.1
        },
        users: {
          totalFarmers: 150,
          activeFarmers: 120,
          newFarmers: 25,
          farmerChange: 8.5,
          activeChange: 12.0,
          newChange: 25.0
        }
      },
      period: {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        type: 'monthly'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await metricsCollection.insertOne(sampleMetrics);
    log.success('Sample analytics data inserted');

  } catch (error) {
    log.error(`Analytics schema setup failed: ${error.message}`);
    throw error;
  }
}

// IoT Service Schema Setup
async function setupIoTSchema(client) {
  log.header('Setting up IoT Service Database');
  
  const db = client.db(config.databases.iot);
  
  try {
    // IoT Devices Collection
    const devicesCollection = db.collection('iot_devices');
    await devicesCollection.createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { userId: 1, status: 1 } },
      { key: { 'location.farmId': 1, status: 1 } },
      { key: { type: 1, status: 1 } },
      { key: { lastSeen: -1 } },
      { key: { createdAt: -1 } }
    ]);
    log.success('IoT devices collection and indexes created');

    // Sensor Data Collection
    const sensorDataCollection = db.collection('sensor_data');
    await sensorDataCollection.createIndexes([
      { key: { deviceId: 1, timestamp: -1 } },
      { key: { userId: 1, timestamp: -1 } },
      { key: { farmId: 1, timestamp: -1 } },
      { key: { timestamp: -1 } },
      { key: { quality: 1, timestamp: -1 } }
    ]);
    log.success('Sensor data collection and indexes created');

    // Device Alerts Collection
    const alertsCollection = db.collection('device_alerts');
    await alertsCollection.createIndexes([
      { key: { userId: 1, acknowledged: 1, createdAt: -1 } },
      { key: { deviceId: 1, acknowledged: 1, createdAt: -1 } },
      { key: { severity: 1, acknowledged: 1, createdAt: -1 } },
      { key: { alertType: 1, createdAt: -1 } }
    ]);
    log.success('Device alerts collection and indexes created');

    // Insert sample IoT devices
    const sampleDevices = [
      {
        id: 'device_001',
        name: 'Soil Sensor Alpha',
        type: 'soil_sensor',
        status: 'online',
        lastSeen: new Date(),
        batteryLevel: 85,
        signalStrength: 75,
        location: {
          farmId: 'farm123',
          farmName: 'Green Valley Farm',
          field: 'Field A'
        },
        sensorReadings: {
          temperature: 22.5,
          humidity: 65,
          soilMoisture: 45,
          ph: 6.8
        },
        firmware: 'v1.2.3',
        userId: 'user123',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'device_002',
        name: 'Weather Station Beta',
        type: 'weather_station',
        status: 'online',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        batteryLevel: 92,
        signalStrength: 88,
        location: {
          farmId: 'farm123',
          farmName: 'Green Valley Farm',
          field: 'Central'
        },
        sensorReadings: {
          temperature: 24.1,
          humidity: 58,
          pressure: 1013.25
        },
        firmware: 'v2.1.0',
        userId: 'user123',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await devicesCollection.insertMany(sampleDevices);
    log.success('Sample IoT device data inserted');

  } catch (error) {
    log.error(`IoT schema setup failed: ${error.message}`);
    throw error;
  }
}

// Weather Service Schema Setup
async function setupWeatherSchema(client) {
  log.header('Setting up Weather Service Database');
  
  const db = client.db(config.databases.weather);
  
  try {
    // Weather Data Collection
    const weatherCollection = db.collection('weather_data');
    await weatherCollection.createIndexes([
      { key: { 'location.coordinates': '2dsphere' } },
      { key: { 'location.farmId': 1, timestamp: -1 } },
      { key: { userId: 1, timestamp: -1 } },
      { key: { timestamp: -1 } },
      { key: { dataSource: 1, timestamp: -1 } }
    ]);
    log.success('Weather data collection and indexes created');

    // Weather Alerts Collection
    const weatherAlertsCollection = db.collection('weather_alerts');
    await weatherAlertsCollection.createIndexes([
      { key: { isActive: 1, severity: 1, startTime: -1 } },
      { key: { 'location.coordinates': '2dsphere' } },
      { key: { farmId: 1, isActive: 1, startTime: -1 } },
      { key: { alertType: 1, isActive: 1 } }
    ]);
    log.success('Weather alerts collection and indexes created');

    // Historical Weather Collection
    const historicalWeatherCollection = db.collection('historical_weather');
    await historicalWeatherCollection.createIndexes([
      { key: { 'location.farmId': 1, date: -1 } },
      { key: { date: -1 } },
      { key: { 'location.coordinates': '2dsphere' } }
    ]);
    log.success('Historical weather collection and indexes created');

    // Insert sample weather data
    const sampleWeatherData = {
      location: {
        name: 'Green Valley Farm',
        farmId: 'farm123',
        coordinates: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      },
      current: {
        temperature: 24,
        humidity: 68,
        windSpeed: 12,
        windDirection: 180,
        visibility: 10,
        pressure: 1013,
        condition: 'partly-cloudy',
        uvIndex: 6,
        rainfall: 0,
        cloudCover: 30
      },
      forecast: [
        {
          date: new Date(),
          day: 'Today',
          high: 26,
          low: 18,
          condition: 'sunny',
          precipitation: 0,
          windSpeed: 10,
          humidity: 65
        },
        {
          date: new Date(Date.now() + 24 * 60 * 60 * 1000),
          day: 'Tomorrow',
          high: 24,
          low: 16,
          condition: 'cloudy',
          precipitation: 20,
          windSpeed: 15,
          humidity: 70
        }
      ],
      agriculturalInsights: {
        irrigation: {
          recommended: false,
          reason: 'Soil moisture levels are adequate',
          nextRecommendation: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        },
        planting: {
          conditions: 'good',
          recommendations: ['Ideal conditions for spring planting', 'Monitor soil temperature']
        },
        harvesting: {
          conditions: 'excellent',
          recommendations: ['Perfect weather for harvesting', 'Low humidity reduces spoilage risk']
        }
      },
      dataSource: 'AgricultureWeatherAPI',
      userId: 'user123',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await weatherCollection.insertOne(sampleWeatherData);
    log.success('Sample weather data inserted');

  } catch (error) {
    log.error(`Weather schema setup failed: ${error.message}`);
    throw error;
  }
}

// Financial Service Schema Enhancement
async function setupFinancialSchema(client) {
  log.header('Setting up Financial Service Database');
  
  const db = client.db(config.databases.financial);
  
  try {
    // Ensure transactions collection has proper indexes
    const transactionsCollection = db.collection('transactions');
    await transactionsCollection.createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { farmId: 1, createdAt: -1 } },
      { key: { type: 1, status: 1, createdAt: -1 } },
      { key: { category: 1, createdAt: -1 } },
      { key: { amount: 1, createdAt: -1 } },
      { key: { status: 1, createdAt: -1 } }
    ]);
    log.success('Transactions collection indexes updated');

    // Create financial summaries collection
    const summariesCollection = db.collection('financial_summaries');
    await summariesCollection.createIndexes([
      { key: { userId: 1, period: 1, createdAt: -1 } },
      { key: { farmId: 1, period: 1, createdAt: -1 } },
      { key: { period: 1, createdAt: -1 } }
    ]);
    log.success('Financial summaries collection and indexes created');

    // Sample transactions for testing
    const sampleTransactions = [
      {
        id: 'txn_001',
        type: 'income',
        amount: 15000,
        description: 'Crop Sale - Wheat Harvest',
        status: 'completed',
        category: 'sales',
        farmName: 'Green Valley Farm',
        farmId: 'farm123',
        userId: 'user123',
        paymentMethod: 'bank_transfer',
        currency: 'USD',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'txn_002',
        type: 'expense',
        amount: 2500,
        description: 'Equipment Maintenance',
        status: 'completed',
        category: 'maintenance',
        farmName: 'Green Valley Farm',
        farmId: 'farm123',
        userId: 'user123',
        paymentMethod: 'credit_card',
        currency: 'USD',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'txn_003',
        type: 'income',
        amount: 8000,
        description: 'Government Subsidy Payment',
        status: 'pending',
        category: 'subsidy',
        farmName: 'Green Valley Farm',
        farmId: 'farm123',
        userId: 'user123',
        paymentMethod: 'government_transfer',
        currency: 'USD',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    // Check if transactions already exist to avoid duplicates
    const existingCount = await transactionsCollection.countDocuments({ userId: 'user123' });
    if (existingCount === 0) {
      await transactionsCollection.insertMany(sampleTransactions);
      log.success('Sample financial transaction data inserted');
    } else {
      log.info('Sample financial data already exists, skipping insertion');
    }

  } catch (error) {
    log.error(`Financial schema setup failed: ${error.message}`);
    throw error;
  }
}

// Main setup function
async function setupDatabaseSchemas() {
  console.log(chalk.bold.blue('\n🗄️  Dashboard Database Schema Setup\n'));
  
  let client;
  
  try {
    // Connect to MongoDB
    log.info(`Connecting to MongoDB: ${config.mongoUrl}`);
    client = new MongoClient(config.mongoUrl);
    await client.connect();
    log.success('Connected to MongoDB');

    // Setup schemas for each service
    await setupAnalyticsSchema(client);
    await setupIoTSchema(client);
    await setupWeatherSchema(client);
    await setupFinancialSchema(client);

    log.header('Database Setup Complete');
    log.success('All database schemas and indexes have been created');
    log.success('Sample data has been inserted for testing');
    
    console.log(chalk.bold.green('\n✅ Database setup completed successfully!\n'));
    
    // List created databases
    const admin = client.db().admin();
    const databasesList = await admin.listDatabases();
    
    log.info('Available databases:');
    databasesList.databases.forEach(db => {
      if (Object.values(config.databases).includes(db.name)) {
        console.log(chalk.green(`  ✓ ${db.name}`));
      }
    });

  } catch (error) {
    log.error(`Database setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      log.info('MongoDB connection closed');
    }
  }
}

// Cleanup function
async function cleanupDatabases() {
  console.log(chalk.bold.yellow('\n🧹 Cleaning up test databases\n'));
  
  let client;
  
  try {
    client = new MongoClient(config.mongoUrl);
    await client.connect();
    
    for (const [service, dbName] of Object.entries(config.databases)) {
      await client.db(dbName).dropDatabase();
      log.success(`Dropped ${service} database: ${dbName}`);
    }
    
    console.log(chalk.bold.green('\n✅ Database cleanup completed!\n'));
    
  } catch (error) {
    log.error(`Database cleanup failed: ${error.message}`);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    cleanupDatabases();
  } else {
    setupDatabaseSchemas();
  }
}

module.exports = {
  setupDatabaseSchemas,
  cleanupDatabases,
  config
};