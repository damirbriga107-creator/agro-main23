// init-mongodb.js
// MongoDB initialization script for DaorsAgro platform
// This script sets up the necessary collections, indexes, and initial data

print('🚀 Initializing DaorsAgro MongoDB database...');

// Switch to the production database
db = db.getSiblingDB('agro_production');

// Create collections with validation rules
print('📦 Creating collections with validation...');

// Farm Management Collection
db.createCollection('farms', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'farmName', 'location', 'createdAt'],
      properties: {
        userId: { bsonType: 'string', description: 'User ID from PostgreSQL' },
        farmName: { bsonType: 'string', minLength: 1, maxLength: 200 },
        farmSize: { bsonType: 'number', minimum: 0 },
        location: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: { enum: ['Point'] },
            coordinates: {
              bsonType: 'array',
              items: { bsonType: 'number' },
              minItems: 2,
              maxItems: 2
            }
          }
        },
        cropTypes: { bsonType: 'array', items: { bsonType: 'string' } },
        farmingPractices: { bsonType: 'array', items: { bsonType: 'string' } },
        soilType: { bsonType: 'string' },
        irrigationMethod: { bsonType: 'string' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// Crop Management Collection
db.createCollection('crops', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['farmId', 'cropName', 'plantingDate', 'createdAt'],
      properties: {
        farmId: { bsonType: 'objectId' },
        cropName: { bsonType: 'string', minLength: 1 },
        variety: { bsonType: 'string' },
        plantingDate: { bsonType: 'date' },
        expectedHarvestDate: { bsonType: 'date' },
        actualHarvestDate: { bsonType: 'date' },
        plantedArea: { bsonType: 'number', minimum: 0 },
        expectedYield: { bsonType: 'number', minimum: 0 },
        actualYield: { bsonType: 'number', minimum: 0 },
        status: { enum: ['planned', 'planted', 'growing', 'harvested', 'failed'] },
        growthStage: { bsonType: 'string' },
        healthStatus: { enum: ['excellent', 'good', 'fair', 'poor', 'critical'] },
        notes: { bsonType: 'string' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

// IoT Sensor Data Collection
db.createCollection('sensor_data', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['deviceId', 'farmId', 'timestamp', 'sensorType', 'value'],
      properties: {
        deviceId: { bsonType: 'string' },
        farmId: { bsonType: 'objectId' },
        timestamp: { bsonType: 'date' },
        sensorType: { 
          enum: ['temperature', 'humidity', 'soil_moisture', 'light', 'ph', 'nitrogen', 'phosphorus', 'potassium']
        },
        value: { bsonType: 'number' },
        unit: { bsonType: 'string' },
        location: {
          bsonType: 'object',
          properties: {
            type: { enum: ['Point'] },
            coordinates: { bsonType: 'array', items: { bsonType: 'number' } }
          }
        },
        quality: { enum: ['good', 'fair', 'poor'] },
        metadata: { bsonType: 'object' }
      }
    }
  }
});

// Weather Data Collection
db.createCollection('weather_data', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['location', 'timestamp', 'temperature', 'humidity'],
      properties: {
        location: {
          bsonType: 'object',
          required: ['type', 'coordinates'],
          properties: {
            type: { enum: ['Point'] },
            coordinates: { bsonType: 'array', items: { bsonType: 'number' } }
          }
        },
        timestamp: { bsonType: 'date' },
        temperature: { bsonType: 'number' },
        humidity: { bsonType: 'number', minimum: 0, maximum: 100 },
        pressure: { bsonType: 'number' },
        windSpeed: { bsonType: 'number', minimum: 0 },
        windDirection: { bsonType: 'number', minimum: 0, maximum: 360 },
        precipitation: { bsonType: 'number', minimum: 0 },
        visibility: { bsonType: 'number', minimum: 0 },
        uvIndex: { bsonType: 'number', minimum: 0 },
        cloudCover: { bsonType: 'number', minimum: 0, maximum: 100 },
        source: { bsonType: 'string' },
        isForecasted: { bsonType: 'bool' }
      }
    }
  }
});

// Analytics and Reports Collection
db.createCollection('analytics_reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'reportType', 'generatedAt', 'data'],
      properties: {
        userId: { bsonType: 'string' },
        farmId: { bsonType: 'objectId' },
        reportType: { 
          enum: ['yield_analysis', 'financial_summary', 'crop_health', 'weather_impact', 'resource_usage']
        },
        generatedAt: { bsonType: 'date' },
        periodStart: { bsonType: 'date' },
        periodEnd: { bsonType: 'date' },
        data: { bsonType: 'object' },
        insights: { bsonType: 'array', items: { bsonType: 'string' } },
        recommendations: { bsonType: 'array', items: { bsonType: 'string' } },
        status: { enum: ['generating', 'completed', 'error'] },
        metadata: { bsonType: 'object' }
      }
    }
  }
});

// Market Prices Collection
db.createCollection('market_prices', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['crop', 'market', 'date', 'price'],
      properties: {
        crop: { bsonType: 'string', minLength: 1 },
        variety: { bsonType: 'string' },
        market: { bsonType: 'string' },
        location: {
          bsonType: 'object',
          properties: {
            city: { bsonType: 'string' },
            state: { bsonType: 'string' },
            country: { bsonType: 'string' },
            coordinates: { bsonType: 'array', items: { bsonType: 'number' } }
          }
        },
        date: { bsonType: 'date' },
        price: { bsonType: 'number', minimum: 0 },
        currency: { bsonType: 'string', minLength: 3, maxLength: 3 },
        unit: { bsonType: 'string' },
        quality: { enum: ['premium', 'grade_a', 'grade_b', 'standard', 'below_standard'] },
        volume: { bsonType: 'number', minimum: 0 },
        source: { bsonType: 'string' },
        isVerified: { bsonType: 'bool' },
        trend: { enum: ['rising', 'falling', 'stable'] }
      }
    }
  }
});

// Notifications Collection
db.createCollection('notifications', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'type', 'title', 'message', 'createdAt'],
      properties: {
        userId: { bsonType: 'string' },
        type: { 
          enum: ['alert', 'reminder', 'update', 'marketing', 'system', 'weather', 'crop', 'financial']
        },
        priority: { enum: ['low', 'medium', 'high', 'critical'] },
        title: { bsonType: 'string', minLength: 1, maxLength: 200 },
        message: { bsonType: 'string', minLength: 1 },
        data: { bsonType: 'object' },
        isRead: { bsonType: 'bool' },
        readAt: { bsonType: 'date' },
        channel: { enum: ['push', 'email', 'sms', 'in_app'] },
        createdAt: { bsonType: 'date' },
        expiresAt: { bsonType: 'date' }
      }
    }
  }
});

print('✅ Collections created successfully');

// Create indexes for better performance
print('🔍 Creating indexes...');

// Farms indexes
db.farms.createIndex({ userId: 1 });
db.farms.createIndex({ location: '2dsphere' });
db.farms.createIndex({ createdAt: -1 });
db.farms.createIndex({ isActive: 1 });
db.farms.createIndex({ farmName: 'text' });

// Crops indexes
db.crops.createIndex({ farmId: 1 });
db.crops.createIndex({ cropName: 1 });
db.crops.createIndex({ status: 1 });
db.crops.createIndex({ plantingDate: -1 });
db.crops.createIndex({ expectedHarvestDate: 1 });
db.crops.createIndex({ createdAt: -1 });

// Sensor data indexes
db.sensor_data.createIndex({ deviceId: 1, timestamp: -1 });
db.sensor_data.createIndex({ farmId: 1, timestamp: -1 });
db.sensor_data.createIndex({ sensorType: 1, timestamp: -1 });
db.sensor_data.createIndex({ timestamp: -1 });
db.sensor_data.createIndex({ location: '2dsphere' });
// TTL index to remove old sensor data after 1 year
db.sensor_data.createIndex({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Weather data indexes
db.weather_data.createIndex({ location: '2dsphere' });
db.weather_data.createIndex({ timestamp: -1 });
db.weather_data.createIndex({ isForecasted: 1, timestamp: -1 });
// TTL index to remove old weather data after 2 years
db.weather_data.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// Analytics reports indexes
db.analytics_reports.createIndex({ userId: 1, generatedAt: -1 });
db.analytics_reports.createIndex({ reportType: 1, generatedAt: -1 });
db.analytics_reports.createIndex({ farmId: 1, generatedAt: -1 });
db.analytics_reports.createIndex({ status: 1 });

// Market prices indexes
db.market_prices.createIndex({ crop: 1, date: -1 });
db.market_prices.createIndex({ market: 1, date: -1 });
db.market_prices.createIndex({ date: -1 });
db.market_prices.createIndex({ location: '2dsphere' });
// TTL index to remove old price data after 5 years
db.market_prices.createIndex({ date: 1 }, { expireAfterSeconds: 5 * 365 * 24 * 60 * 60 });

// Notifications indexes
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ type: 1, createdAt: -1 });
db.notifications.createIndex({ isRead: 1, userId: 1 });
db.notifications.createIndex({ priority: 1, createdAt: -1 });
// TTL index for notification expiration
db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('✅ Indexes created successfully');

// Insert sample data for development/testing
print('📝 Inserting sample data...');

// Sample farm data
const sampleFarmId = ObjectId();
db.farms.insertMany([
  {
    _id: sampleFarmId,
    userId: '123e4567-e89b-12d3-a456-426614174000', // Sample UUID
    farmName: 'Green Valley Farm',
    farmSize: 25.5,
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749] // San Francisco coordinates
    },
    cropTypes: ['corn', 'soybeans', 'wheat'],
    farmingPractices: ['organic', 'crop_rotation'],
    soilType: 'loamy',
    irrigationMethod: 'drip',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    userId: '123e4567-e89b-12d3-a456-426614174001',
    farmName: 'Sunny Acres Farm',
    farmSize: 40.0,
    location: {
      type: 'Point',
      coordinates: [-118.2437, 34.0522] // Los Angeles coordinates
    },
    cropTypes: ['tomatoes', 'peppers', 'lettuce'],
    farmingPractices: ['greenhouse', 'hydroponics'],
    soilType: 'sandy',
    irrigationMethod: 'sprinkler',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Sample crop data
db.crops.insertMany([
  {
    farmId: sampleFarmId,
    cropName: 'corn',
    variety: 'sweet corn',
    plantingDate: new Date('2024-03-15'),
    expectedHarvestDate: new Date('2024-08-15'),
    plantedArea: 10.5,
    expectedYield: 8500,
    status: 'growing',
    growthStage: 'vegetative',
    healthStatus: 'good',
    notes: 'Good growth progress, regular watering',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    farmId: sampleFarmId,
    cropName: 'soybeans',
    variety: 'non-GMO',
    plantingDate: new Date('2024-04-01'),
    expectedHarvestDate: new Date('2024-09-30'),
    plantedArea: 15.0,
    expectedYield: 3200,
    status: 'growing',
    growthStage: 'flowering',
    healthStatus: 'excellent',
    notes: 'Excellent condition, pest-free',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

// Sample sensor data (recent data only)
const now = new Date();
const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

db.sensor_data.insertMany([
  {
    deviceId: 'SENSOR001',
    farmId: sampleFarmId,
    timestamp: new Date(oneDayAgo.getTime() + 1 * 60 * 60 * 1000), // 1 hour ago
    sensorType: 'temperature',
    value: 22.5,
    unit: '°C',
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    quality: 'good'
  },
  {
    deviceId: 'SENSOR001',
    farmId: sampleFarmId,
    timestamp: new Date(oneDayAgo.getTime() + 1 * 60 * 60 * 1000),
    sensorType: 'humidity',
    value: 65.2,
    unit: '%',
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    quality: 'good'
  },
  {
    deviceId: 'SENSOR002',
    farmId: sampleFarmId,
    timestamp: new Date(oneDayAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours ago
    sensorType: 'soil_moisture',
    value: 45.8,
    unit: '%',
    location: {
      type: 'Point',
      coordinates: [-122.4195, 37.7750]
    },
    quality: 'good'
  }
]);

// Sample weather data
db.weather_data.insertMany([
  {
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    timestamp: now,
    temperature: 23.0,
    humidity: 68,
    pressure: 1013.25,
    windSpeed: 5.2,
    windDirection: 180,
    precipitation: 0,
    visibility: 10,
    uvIndex: 6,
    cloudCover: 25,
    source: 'OpenWeatherMap',
    isForecasted: false
  }
]);

// Sample market prices
db.market_prices.insertMany([
  {
    crop: 'corn',
    variety: 'yellow corn',
    market: 'Chicago Board of Trade',
    location: {
      city: 'Chicago',
      state: 'Illinois',
      country: 'USA',
      coordinates: [-87.6298, 41.8781]
    },
    date: new Date(),
    price: 6.25,
    currency: 'USD',
    unit: 'bushel',
    quality: 'grade_a',
    volume: 5000,
    source: 'CBOT',
    isVerified: true,
    trend: 'rising'
  },
  {
    crop: 'soybeans',
    market: 'Chicago Board of Trade',
    location: {
      city: 'Chicago',
      state: 'Illinois',
      country: 'USA',
      coordinates: [-87.6298, 41.8781]
    },
    date: new Date(),
    price: 15.80,
    currency: 'USD',
    unit: 'bushel',
    quality: 'grade_a',
    volume: 3000,
    source: 'CBOT',
    isVerified: true,
    trend: 'stable'
  }
]);

// Sample notification
db.notifications.insertOne({
  userId: '123e4567-e89b-12d3-a456-426614174000',
  type: 'weather',
  priority: 'medium',
  title: 'Weather Alert',
  message: 'Rain expected in your area for the next 3 days. Consider adjusting irrigation schedule.',
  data: {
    weatherType: 'rain',
    duration: '3 days',
    action: 'adjust_irrigation'
  },
  isRead: false,
  channel: 'push',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
});

print('✅ Sample data inserted successfully');

// Create users for different services (similar to PostgreSQL roles)
print('👥 Creating service users...');

db.getSiblingDB('admin').createUser({
  user: 'analytics_service',
  pwd: 'analytics_service_password',
  roles: [
    { role: 'readWrite', db: 'agro_production' }
  ]
});

db.getSiblingDB('admin').createUser({
  user: 'iot_service',
  pwd: 'iot_service_password',
  roles: [
    { role: 'readWrite', db: 'agro_production' }
  ]
});

db.getSiblingDB('admin').createUser({
  user: 'notification_service',
  pwd: 'notification_service_password',
  roles: [
    { role: 'readWrite', db: 'agro_production' }
  ]
});

print('✅ Service users created successfully');

// Create aggregation pipelines as stored functions (MongoDB 4.4+)
print('📊 Creating aggregation pipelines...');

// Farm analytics pipeline
db.system.js.save({
  _id: 'getFarmAnalytics',
  value: function(farmId) {
    return db.sensor_data.aggregate([
      { $match: { farmId: ObjectId(farmId) } },
      {
        $group: {
          _id: {
            sensorType: '$sensorType',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          avgValue: { $avg: '$value' },
          minValue: { $min: '$value' },
          maxValue: { $max: '$value' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': -1, '_id.sensorType': 1 } },
      { $limit: 100 }
    ]).toArray();
  }
});

// Crop health summary pipeline
db.system.js.save({
  _id: 'getCropHealthSummary',
  value: function(userId) {
    return db.farms.aggregate([
      { $match: { userId: userId } },
      {
        $lookup: {
          from: 'crops',
          localField: '_id',
          foreignField: 'farmId',
          as: 'crops'
        }
      },
      {
        $project: {
          farmName: 1,
          totalCrops: { $size: '$crops' },
          healthySummary: {
            $reduce: {
              input: '$crops',
              initialValue: { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 },
              in: {
                excellent: {
                  $cond: [{ $eq: ['$$this.healthStatus', 'excellent'] }, { $add: ['$$value.excellent', 1] }, '$$value.excellent']
                },
                good: {
                  $cond: [{ $eq: ['$$this.healthStatus', 'good'] }, { $add: ['$$value.good', 1] }, '$$value.good']
                },
                fair: {
                  $cond: [{ $eq: ['$$this.healthStatus', 'fair'] }, { $add: ['$$value.fair', 1] }, '$$value.fair']
                },
                poor: {
                  $cond: [{ $eq: ['$$this.healthStatus', 'poor'] }, { $add: ['$$value.poor', 1] }, '$$value.poor']
                },
                critical: {
                  $cond: [{ $eq: ['$$this.healthStatus', 'critical'] }, { $add: ['$$value.critical', 1] }, '$$value.critical']
                }
              }
            }
          }
        }
      }
    ]).toArray();
  }
});

print('✅ Aggregation pipelines created successfully');

print('🎉 MongoDB initialization completed successfully!');
print('📍 Database: agro_production');
print('📦 Collections created: farms, crops, sensor_data, weather_data, analytics_reports, market_prices, notifications');
print('🔍 Indexes created for optimal performance');
print('📝 Sample data inserted for development');
print('👥 Service users created with appropriate permissions');
print('📊 Aggregation pipelines saved for analytics');