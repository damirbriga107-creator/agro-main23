import { Schema, model, Document } from 'mongoose';

// IoT Device Schema
export interface IDevice extends Document {
  id: string;
  name: string;
  type: 'soil_sensor' | 'weather_station' | 'irrigation_controller' | 'camera' | 'moisture_sensor' | 'temperature_sensor';
  status: 'online' | 'offline' | 'warning' | 'maintenance' | 'error';
  lastSeen: Date;
  batteryLevel?: number;
  signalStrength?: number;
  location: {
    farmId: string;
    farmName: string;
    field?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  sensorReadings?: {
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    ph?: number;
    lightIntensity?: number;
    pressure?: number;
  };
  firmware: string;
  configuration?: Record<string, any>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDevice>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['soil_sensor', 'weather_station', 'irrigation_controller', 'camera', 'moisture_sensor', 'temperature_sensor'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['online', 'offline', 'warning', 'maintenance', 'error'], 
    required: true,
    default: 'offline'
  },
  lastSeen: { type: Date, required: true, default: Date.now },
  batteryLevel: { type: Number, min: 0, max: 100 },
  signalStrength: { type: Number, min: 0, max: 100 },
  location: {
    farmId: { type: String, required: true, index: true },
    farmName: { type: String, required: true },
    field: { type: String },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  sensorReadings: {
    temperature: { type: Number },
    humidity: { type: Number, min: 0, max: 100 },
    soilMoisture: { type: Number, min: 0, max: 100 },
    ph: { type: Number, min: 0, max: 14 },
    lightIntensity: { type: Number, min: 0 },
    pressure: { type: Number, min: 0 }
  },
  firmware: { type: String, required: true },
  configuration: { type: Schema.Types.Mixed },
  userId: { type: String, required: true, index: true }
}, {
  timestamps: true,
  collection: 'iot_devices'
});

// Indexes for performance
DeviceSchema.index({ userId: 1, status: 1 });
DeviceSchema.index({ 'location.farmId': 1, status: 1 });
DeviceSchema.index({ type: 1, status: 1 });
DeviceSchema.index({ lastSeen: -1 });

// Sensor Data Schema for historical data
export interface ISensorData extends Document {
  deviceId: string;
  deviceType: string;
  userId: string;
  farmId: string;
  readings: {
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    ph?: number;
    lightIntensity?: number;
    pressure?: number;
    windSpeed?: number;
    rainfall?: number;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  quality: 'good' | 'warning' | 'error';
  timestamp: Date;
  metadata?: Record<string, any>;
}

const SensorDataSchema = new Schema<ISensorData>({
  deviceId: { type: String, required: true, index: true },
  deviceType: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  readings: {
    temperature: { type: Number },
    humidity: { type: Number, min: 0, max: 100 },
    soilMoisture: { type: Number, min: 0, max: 100 },
    ph: { type: Number, min: 0, max: 14 },
    lightIntensity: { type: Number, min: 0 },
    pressure: { type: Number, min: 0 },
    windSpeed: { type: Number, min: 0 },
    rainfall: { type: Number, min: 0 }
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  quality: { 
    type: String, 
    enum: ['good', 'warning', 'error'], 
    required: true,
    default: 'good'
  },
  timestamp: { type: Date, required: true, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
}, {
  collection: 'sensor_data'
});

// Indexes for sensor data
SensorDataSchema.index({ deviceId: 1, timestamp: -1 });
SensorDataSchema.index({ userId: 1, timestamp: -1 });
SensorDataSchema.index({ farmId: 1, timestamp: -1 });
SensorDataSchema.index({ timestamp: -1 });

// Device alerts Schema
export interface IDeviceAlert extends Document {
  deviceId: string;
  userId: string;
  farmId: string;
  alertType: 'low_battery' | 'offline' | 'sensor_error' | 'maintenance_required' | 'threshold_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceAlertSchema = new Schema<IDeviceAlert>({
  deviceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  alertType: { 
    type: String, 
    enum: ['low_battery', 'offline', 'sensor_error', 'maintenance_required', 'threshold_exceeded'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
  resolvedAt: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'device_alerts'
});

// Indexes for device alerts
DeviceAlertSchema.index({ userId: 1, acknowledged: 1, createdAt: -1 });
DeviceAlertSchema.index({ deviceId: 1, acknowledged: 1, createdAt: -1 });
DeviceAlertSchema.index({ severity: 1, acknowledged: 1, createdAt: -1 });

export const Device = model<IDevice>('Device', DeviceSchema);
export const SensorData = model<ISensorData>('SensorData', SensorDataSchema);
export const DeviceAlert = model<IDeviceAlert>('DeviceAlert', DeviceAlertSchema);