import { Logger, KafkaConnection } from '@daorsagro/utils';
import { MongoClient, Db, Collection } from 'mongodb';
import { Logger } from '@daorsagro/utils';
import { 
  SensorReading, 
  AggregatedSensorData, 
  DataQualityMetrics 
} from '../models/iot.model';

const logger = new Logger('data-processing-service');

export class DataProcessingService {
  private db: Db;
  private readingsCollection: Collection<SensorReading>;
  private aggregatedCollection: Collection<AggregatedSensorData>;

  constructor(mongoClient?: MongoClient) {
    if (mongoClient) {
      this.db = mongoClient.db('daorsagro');
      this.readingsCollection = this.db.collection('sensor_readings');
      this.aggregatedCollection = this.db.collection('aggregated_sensor_data');
    }
  }

  /**
   * Ingest sensor data
   */
  async ingestSensorData(sensorData: any): Promise<{ success: boolean, id?: string }> {
    try {
      // Validate and enrich sensor data
      const reading: SensorReading = {
        deviceId: sensorData.deviceId,
        timestamp: new Date(sensorData.timestamp || Date.now()),
        data: sensorData.data,
        location: sensorData.location,
        quality: this.calculateDataQuality(sensorData.data),
        processed: {
          processed: false,
          algorithms: []
        },
        metadata: {
          source: 'device',
          version: '1.0.0',
          correlationId: sensorData.correlationId
        }
      };

      if (!this.readingsCollection) {
        // Mock implementation
        logger.info('Mock: Sensor data ingested', { deviceId: reading.deviceId });
        return { success: true, id: 'mock-reading-id' };
      }

      const result = await this.readingsCollection.insertOne(reading);
      
      // Trigger async processing
      this.processDataAsync(reading);
      
      logger.info('Sensor data ingested successfully', { 
        deviceId: reading.deviceId, 
        id: result.insertedId 
      });
      
      return { success: true, id: result.insertedId.toString() };
    } catch (error) {
      logger.error('Failed to ingest sensor data:', error);
      throw error;
    }
  }

  /**
   * Bulk ingest sensor data
   */
  async bulkIngestSensorData(sensorDataArray: any[]): Promise<{ success: boolean, processed: number, failed: number }> {
    try {
      if (!this.readingsCollection) {
        // Mock implementation
        logger.info('Mock: Bulk sensor data ingested', { count: sensorDataArray.length });
        return { success: true, processed: sensorDataArray.length, failed: 0 };
      }

      const readings: SensorReading[] = sensorDataArray.map(data => ({
        deviceId: data.deviceId,
        timestamp: new Date(data.timestamp || Date.now()),
        data: data.data,
        location: data.location,
        quality: this.calculateDataQuality(data.data),
        processed: {
          processed: false,
          algorithms: []
        },
        metadata: {
          source: 'device',
          version: '1.0.0',
          correlationId: data.correlationId
        }
      }));

      const result = await this.readingsCollection.insertMany(readings, { ordered: false });
      
      // Trigger async processing for all readings
      readings.forEach(reading => this.processDataAsync(reading));
      
      logger.info('Bulk sensor data ingested successfully', { 
        processed: result.insertedCount,
        total: sensorDataArray.length
      });
      
      return { 
        success: true, 
        processed: result.insertedCount, 
        failed: sensorDataArray.length - result.insertedCount 
      };
    } catch (error) {
      logger.error('Failed to bulk ingest sensor data:', error);
      throw error;
    }
  }

  /**
   * Get sensor data for a device
   */
  async getSensorData(deviceId: string, query: any, userId: string): Promise<SensorReading[]> {
    try {
      if (!this.readingsCollection) {
        // Mock implementation
        return this.getMockSensorData(deviceId);
      }

      const { startDate, endDate, sensorType, limit = 100 } = query;
      
      const filter: any = { deviceId };
      
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate);
        if (endDate) filter.timestamp.$lte = new Date(endDate);
      }
      
      if (sensorType) {
        filter[`data.${sensorType}`] = { $exists: true };
      }

      const readings = await this.readingsCollection
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return readings;
    } catch (error) {
      logger.error('Failed to get sensor data:', error);
      throw error;
    }
  }

  /**
   * Get latest readings for a device
   */
  async getLatestReadings(deviceId: string, userId: string): Promise<SensorReading | null> {
    try {
      if (!this.readingsCollection) {
        // Mock implementation
        const mockData = this.getMockSensorData(deviceId);
        return mockData[0] || null;
      }

      const reading = await this.readingsCollection
        .findOne(
          { deviceId },
          { sort: { timestamp: -1 } }
        );

      return reading;
    } catch (error) {
      logger.error('Failed to get latest readings:', error);
      throw error;
    }
  }

  /**
   * Get aggregated sensor data
   */
  async getAggregatedData(deviceId: string, query: any, userId: string): Promise<AggregatedSensorData[]> {
    try {
      const { aggregation = 'hourly', startDate, endDate, sensorType } = query;
      
      if (!this.readingsCollection) {
        // Mock implementation
        return this.getMockAggregatedData(deviceId, aggregation);
      }

      // Build aggregation pipeline
      const pipeline: any[] = [
        { $match: { deviceId } }
      ];

      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        pipeline[0].$match.timestamp = dateFilter;
      }

      // Group by time period
      const groupBy = this.getGroupByExpression(aggregation);
      pipeline.push({
        $group: {
          _id: groupBy,
          count: { $sum: 1 },
          avgTemperature: { $avg: '$data.temperature' },
          avgHumidity: { $avg: '$data.humidity' },
          avgSoilMoisture: { $avg: '$data.soil_moisture' },
          minTemperature: { $min: '$data.temperature' },
          maxTemperature: { $max: '$data.temperature' },
          avgQuality: { $avg: '$quality.score' }
        }
      });

      pipeline.push({ $sort: { '_id': 1 } });

      const result = await this.readingsCollection.aggregate(pipeline).toArray();
      
      // Transform result to AggregatedSensorData format
      return result.map(item => ({
        deviceId,
        sensorType: sensorType || 'all',
        aggregationType: aggregation,
        period: {
          start: new Date(item._id),
          end: new Date(item._id)
        },
        statistics: {
          min: item.minTemperature || 0,
          max: item.maxTemperature || 0,
          avg: item.avgTemperature || 0,
          median: item.avgTemperature || 0,
          count: item.count,
          stdDev: 0
        },
        dataPoints: [{
          timestamp: new Date(item._id),
          value: item.avgTemperature || 0,
          quality: item.avgQuality || 100
        }]
      }));
    } catch (error) {
      logger.error('Failed to get aggregated data:', error);
      throw error;
    }
  }

  /**
   * Get sensor statistics
   */
  async getSensorStatistics(deviceId: string, userId: string): Promise<any> {
    try {
      if (!this.readingsCollection) {
        // Mock implementation
        return this.getMockStatistics(deviceId);
      }

      const pipeline = [
        { $match: { deviceId } },
        {
          $group: {
            _id: null,
            totalReadings: { $sum: 1 },
            avgTemperature: { $avg: '$data.temperature' },
            avgHumidity: { $avg: '$data.humidity' },
            avgSoilMoisture: { $avg: '$data.soil_moisture' },
            avgQuality: { $avg: '$quality.score' },
            firstReading: { $min: '$timestamp' },
            lastReading: { $max: '$timestamp' }
          }
        }
      ];

      const result = await this.readingsCollection.aggregate(pipeline).toArray();
      
      return result[0] || {
        totalReadings: 0,
        avgTemperature: 0,
        avgHumidity: 0,
        avgSoilMoisture: 0,
        avgQuality: 0,
        firstReading: null,
        lastReading: null
      };
    } catch (error) {
      logger.error('Failed to get sensor statistics:', error);
      throw error;
    }
  }

  /**
   * Get processed data for a user
   */
  async getProcessedData(query: any, userId: string): Promise<any> {
    try {
      // Mock implementation for now
      return {
        processedReadings: 1250,
        qualityScore: 94,
        trendsDetected: [
          { sensor: 'temperature', trend: 'increasing', confidence: 0.85 },
          { sensor: 'humidity', trend: 'stable', confidence: 0.92 }
        ],
        anomaliesDetected: 2,
        lastProcessed: new Date()
      };
    } catch (error) {
      logger.error('Failed to get processed data:', error);
      throw error;
    }
  }

  /**
   * Export data in various formats
   */
  async exportData(query: any, userId: string): Promise<{ data: any, filename: string, contentType: string }> {
    try {
      const { format = 'csv', startDate, endDate } = query;
      
      // Mock implementation
      const mockData = [
        { timestamp: new Date().toISOString(), temperature: 22.5, humidity: 65 },
        { timestamp: new Date(Date.now() - 3600000).toISOString(), temperature: 21.8, humidity: 67 }
      ];

      let exportData: string;
      let filename: string;
      let contentType: string;

      switch (format) {
        case 'csv':
          exportData = this.convertToCSV(mockData);
          filename = `sensor_data_${Date.now()}.csv`;
          contentType = 'text/csv';
          break;
        case 'json':
          exportData = JSON.stringify(mockData, null, 2);
          filename = `sensor_data_${Date.now()}.json`;
          contentType = 'application/json';
          break;
        default:
          throw new Error('Unsupported export format');
      }

      return { data: exportData, filename, contentType };
    } catch (error) {
      logger.error('Failed to export data:', error);
      throw error;
    }
  }

  /**
   * Get data quality metrics
   */
  async getDataQualityMetrics(query: any, userId: string): Promise<DataQualityMetrics[]> {
    try {
      // Mock implementation
      return [{
        deviceId: 'device-001',
        period: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        },
        metrics: {
          completeness: 95.2,
          accuracy: 98.1,
          consistency: 92.7,
          timeliness: 96.4,
          overall: 95.6
        },
        issues: {
          missingData: 12,
          outliers: 3,
          duplicates: 0,
          delays: 8
        },
        recommendations: [
          'Check sensor calibration for temperature readings',
          'Improve network connectivity to reduce delays'
        ]
      }];
    } catch (error) {
      logger.error('Failed to get data quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get data trends
   */
  async getDataTrends(query: any, userId: string): Promise<any> {
    try {
      // Mock implementation
      return {
        trends: [
          {
            sensorType: 'temperature',
            direction: 'increasing',
            magnitude: 0.5,
            confidence: 0.87,
            period: '7d'
          },
          {
            sensorType: 'humidity',
            direction: 'stable',
            magnitude: 0.1,
            confidence: 0.95,
            period: '7d'
          }
        ],
        correlations: [
          {
            sensors: ['temperature', 'humidity'],
            correlation: -0.72,
            significance: 0.95
          }
        ]
      };
    } catch (error) {
      logger.error('Failed to get data trends:', error);
      throw error;
    }
  }

  /**
   * Get data correlations
   */
  async getDataCorrelations(query: any, userId: string): Promise<any> {
    try {
      // Mock implementation
      return {
        correlationMatrix: {
          temperature: { humidity: -0.72, soil_moisture: 0.45, ph: 0.23 },
          humidity: { temperature: -0.72, soil_moisture: 0.31, ph: -0.18 },
          soil_moisture: { temperature: 0.45, humidity: 0.31, ph: 0.67 },
          ph: { temperature: 0.23, humidity: -0.18, soil_moisture: 0.67 }
        },
        insights: [
          'Strong negative correlation between temperature and humidity',
          'Moderate positive correlation between soil moisture and pH'
        ]
      };
    } catch (error) {
      logger.error('Failed to get data correlations:', error);
      throw error;
    }
  }

  // Private helper methods
  private calculateDataQuality(data: any): { score: number, issues: string[], validated: boolean } {
    let score = 100;
    const issues: string[] = [];
    
    // Check for missing critical values
    if (data.temperature === undefined || data.temperature === null) {
      score -= 20;
      issues.push('Missing temperature data');
    }
    
    // Check for unrealistic values
    if (data.temperature && (data.temperature < -50 || data.temperature > 70)) {
      score -= 15;
      issues.push('Temperature out of expected range');
    }
    
    if (data.humidity && (data.humidity < 0 || data.humidity > 100)) {
      score -= 15;
      issues.push('Humidity out of valid range');
    }
    
    return {
      score: Math.max(0, score),
      issues,
      validated: issues.length === 0
    };
  }

  private async processDataAsync(reading: SensorReading): Promise<void> {
    try {
      // Simulate async processing
      setTimeout(() => {
        logger.debug('Processing sensor reading', { 
          deviceId: reading.deviceId, 
          timestamp: reading.timestamp 
        });
      }, 100);
    } catch (error) {
      logger.error('Failed to process data async:', error);
    }
  }

  private getGroupByExpression(aggregation: string): any {
    switch (aggregation) {
      case 'hourly':
        return {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
      case 'daily':
        return {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
      case 'weekly':
        return {
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        };
      default:
        return '$timestamp';
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => row[header]).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  // Mock data methods
  private getMockSensorData(deviceId: string): SensorReading[] {
    return [
      {
        deviceId,
        timestamp: new Date(),
        data: {
          temperature: 22.5,
          humidity: 65,
          soil_moisture: 42,
          ph: 6.8
        },
        quality: {
          score: 95,
          issues: [],
          validated: true
        },
        processed: {
          processed: true,
          processedAt: new Date(),
          algorithms: ['validation', 'cleaning']
        },
        metadata: {
          source: 'device',
          version: '1.0.0'
        }
      }
    ];
  }

  private getMockAggregatedData(deviceId: string, aggregation: string): AggregatedSensorData[] {
    return [
      {
        deviceId,
        sensorType: 'temperature',
        aggregationType: aggregation as any,
        period: {
          start: new Date(Date.now() - 3600000),
          end: new Date()
        },
        statistics: {
          min: 20.1,
          max: 24.8,
          avg: 22.5,
          median: 22.3,
          count: 12,
          stdDev: 1.2
        },
        dataPoints: [
          {
            timestamp: new Date(),
            value: 22.5,
            quality: 95
          }
        ]
      }
    ];
  }

  private getMockStatistics(deviceId: string): any {
    return {
      totalReadings: 1250,
      avgTemperature: 22.3,
      avgHumidity: 64.2,
      avgSoilMoisture: 41.5,
      avgQuality: 94.2,
      firstReading: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastReading: new Date()
    };
  }
}

export default DataProcessingService;
