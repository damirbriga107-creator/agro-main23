import { Logger, KafkaConnection } from '@daorsagro/utils';
import { SensorReading } from './iot.service';

/**
 * Data processing service for IoT sensor data
 */
export class DataProcessingService {
  private logger: Logger;
  private kafka: KafkaConnection;
  private processingQueue: SensorReading[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.logger = new Logger('data-processing-service');
    this.kafka = KafkaConnection.getInstance();
  }

  /**
   * Start data processing
   */
  start(): void {
    this.logger.info('Starting data processing service');
    
    // Process data every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueuedData();
    }, 30 * 1000);
  }

  /**
   * Stop data processing
   */
  stop(): void {
    this.logger.info('Stopping data processing service');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Add sensor reading to processing queue
   */
  queueSensorReading(reading: SensorReading): void {
    this.processingQueue.push(reading);
    
    // Process immediately if queue is getting large
    if (this.processingQueue.length > 100) {
      this.processQueuedData();
    }
  }

  /**
   * Process queued sensor data
   */
  private async processQueuedData(): Promise<void> {
    if (this.processingQueue.length === 0) return;

    const batch = this.processingQueue.splice(0, 50); // Process in batches of 50
    
    try {
      for (const reading of batch) {
        await this.processSensorReading(reading);
      }
      
      this.logger.debug(`Processed ${batch.length} sensor readings`);
      
    } catch (error) {
      this.logger.error('Error processing sensor data batch', error);
      
      // Re-queue failed readings
      this.processingQueue.unshift(...batch);
    }
  }

  /**
   * Process individual sensor reading
   */
  private async processSensorReading(reading: SensorReading): Promise<void> {
    try {
      // Apply data quality checks
      const qualityScore = this.calculateQualityScore(reading);
      reading.metadata.quality = qualityScore;

      // Detect anomalies
      const anomalies = await this.detectAnomalies(reading);
      if (anomalies.length > 0) {
        reading.alerts = [...(reading.alerts || []), ...anomalies];
      }

      // Calibrate value if needed
      reading.value = this.calibrateValue(reading);
      reading.metadata.calibrated = true;

      // Publish processed data event
      await this.publishProcessedData(reading);
      
    } catch (error) {
      this.logger.error('Error processing sensor reading', error, {
        deviceId: reading.deviceId,
        sensorType: reading.sensorType
      });
    }
  }

  /**
   * Calculate data quality score
   */
  private calculateQualityScore(reading: SensorReading): number {
    let score = 1.0;
    
    // Check timestamp freshness
    const ageMinutes = (Date.now() - reading.timestamp.getTime()) / (1000 * 60);
    if (ageMinutes > 60) {
      score -= 0.2; // Reduce score for old data
    }
    
    // Check for extreme values (simple outlier detection)
    if (this.isExtremeValue(reading)) {
      score -= 0.3;
    }
    
    // Check sensor type specific rules
    score = this.applySensorSpecificQualityRules(reading, score);
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect anomalies in sensor data
   */
  private async detectAnomalies(reading: SensorReading): Promise<string[]> {
    const anomalies: string[] = [];
    
    // Simple anomaly detection - in production this would use ML models
    if (this.isExtremeValue(reading)) {
      anomalies.push(`Extreme ${reading.sensorType} value detected: ${reading.value}`);
    }
    
    // Check for sudden spikes
    if (await this.isSuddenSpike(reading)) {
      anomalies.push(`Sudden spike in ${reading.sensorType} detected`);
    }
    
    return anomalies;
  }

  /**
   * Calibrate sensor value
   */
  private calibrateValue(reading: SensorReading): number {
    // Apply sensor-specific calibration
    switch (reading.sensorType) {
      case 'temperature':
        return this.calibrateTemperature(reading.value);
      case 'humidity':
        return this.calibrateHumidity(reading.value);
      case 'soil_moisture':
        return this.calibrateSoilMoisture(reading.value);
      default:
        return reading.value;
    }
  }

  /**
   * Check if value is extreme
   */
  private isExtremeValue(reading: SensorReading): boolean {
    const extremeRanges: Record<string, { min: number; max: number }> = {
      temperature: { min: -50, max: 70 },
      humidity: { min: 0, max: 100 },
      soil_moisture: { min: 0, max: 100 },
      ph: { min: 0, max: 14 },
      light: { min: 0, max: 100000 }
    };
    
    const range = extremeRanges[reading.sensorType];
    if (!range) return false;
    
    return reading.value < range.min || reading.value > range.max;
  }

  /**
   * Check for sudden spikes in data
   */
  private async isSuddenSpike(reading: SensorReading): Promise<boolean> {
    // This would compare with recent readings from the same sensor
    // For now, return false (simplified implementation)
    return false;
  }

  /**
   * Apply sensor-specific quality rules
   */
  private applySensorSpecificQualityRules(reading: SensorReading, currentScore: number): number {
    switch (reading.sensorType) {
      case 'temperature':
        // Temperature should be within reasonable range
        if (reading.value < -20 || reading.value > 50) {
          currentScore -= 0.1;
        }
        break;
      case 'humidity':
        // Humidity should be 0-100%
        if (reading.value < 0 || reading.value > 100) {
          currentScore -= 0.2;
        }
        break;
    }
    
    return currentScore;
  }

  /**
   * Calibrate temperature reading
   */
  private calibrateTemperature(value: number): number {
    // Apply temperature calibration offset (example)
    return value + 0.5; // Simplified calibration
  }

  /**
   * Calibrate humidity reading
   */
  private calibrateHumidity(value: number): number {
    // Ensure humidity is within 0-100% range
    return Math.max(0, Math.min(100, value));
  }

  /**
   * Calibrate soil moisture reading
   */
  private calibrateSoilMoisture(value: number): number {
    // Apply soil moisture calibration
    return Math.max(0, Math.min(100, value * 1.1)); // Simplified calibration
  }

  /**
   * Publish processed data to Kafka
   */
  private async publishProcessedData(reading: SensorReading): Promise<void> {
    try {
      const producer = this.kafka.getProducer();
      await producer.send({
        topic: 'processed-sensor-data',
        messages: [{
          key: reading.deviceId,
          value: JSON.stringify({
            eventType: 'sensor_data_processed',
            ...reading,
            timestamp: reading.timestamp.toISOString()
          })
        }]
      });
    } catch (error) {
      this.logger.error('Failed to publish processed data', error);
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): any {
    return {
      queueSize: this.processingQueue.length,
      isRunning: this.processingInterval !== null,
      lastUpdated: new Date().toISOString()
    };
  }
}", "original_text": null}]