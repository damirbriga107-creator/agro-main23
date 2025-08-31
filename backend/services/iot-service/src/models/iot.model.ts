import mongoose, { Document, Schema } from 'mongoose';

// Enums
export enum DeviceType {
  SOIL_SENSOR = 'soil_sensor',
  WEATHER_STATION = 'weather_station',
  MOISTURE_SENSOR = 'moisture_sensor',
  TEMPERATURE_SENSOR = 'temperature_sensor',
  HUMIDITY_SENSOR = 'humidity_sensor',
  PH_SENSOR = 'ph_sensor',
  IRRIGATION_CONTROLLER = 'irrigation_controller',
  CAMERA = 'camera',
  LIVESTOCK_TRACKER = 'livestock_tracker',
  CROP_MONITOR = 'crop_monitor',
  GREENHOUSE_CONTROLLER = 'greenhouse_controller',
  WATER_LEVEL_SENSOR = 'water_level_sensor'
}

export enum DeviceStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
  SLEEPING = 'sleeping',
  LOW_BATTERY = 'low_battery'
}

export enum SensorDataType {
  TEMPERATURE = 'temperature',
  HUMIDITY = 'humidity',
  SOIL_MOISTURE = 'soil_moisture',
  SOIL_PH = 'soil_ph',
  LIGHT_INTENSITY = 'light_intensity',
  WATER_LEVEL = 'water_level',
  BATTERY_LEVEL = 'battery_level',
  LOCATION = 'location',
  IMAGE = 'image',
  RAINFALL = 'rainfall',
  WIND_SPEED = 'wind_speed',
  ATMOSPHERIC_PRESSURE = 'atmospheric_pressure',
  UV_INDEX = 'uv_index',
  SOIL_TEMPERATURE = 'soil_temperature',
  LEAF_WETNESS = 'leaf_wetness',
  CO2_LEVEL = 'co2_level'
}

export enum AlertType {
  LOW_SOIL_MOISTURE = 'low_soil_moisture',
  HIGH_TEMPERATURE = 'high_temperature',
  LOW_BATTERY = 'low_battery',
  DEVICE_OFFLINE = 'device_offline',
  FROST_WARNING = 'frost_warning',
  IRRIGATION_NEEDED = 'irrigation_needed',
  PEST_DETECTION = 'pest_detection',
  DISEASE_WARNING = 'disease_warning',
  MAINTENANCE_DUE = 'maintenance_due'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Interfaces
export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  altitude?: number;
}

export interface IDeviceDocument extends Document {
  deviceId: string;
  name: string;
  type: DeviceType;
  model: string;
  manufacturer: string;
  firmwareVersion: string;
  userId: string;
  farmId: string;
  location: ILocation;
  zone?: string; // Field zone identifier
  status: DeviceStatus;
  lastSeen: Date;
  batteryLevel?: number;
  signalStrength?: number;
  configuration: {
    reportingInterval: number; // seconds
    thresholds: Record<string, {
      min?: number;
      max?: number;
      unit: string;
    }>;
    calibration: Record<string, number>;
    settings: Record<string, any>;
  };
  connectivity: {
    protocol: 'mqtt' | 'http' | 'lorawan' | 'zigbee' | 'wifi';
    networkId?: string;
    endpoint?: string;
    credentials?: Record<string, string>;
  };
  maintenance: {
    installDate: Date;
    lastMaintenance?: Date;
    nextMaintenance?: Date;
    maintenanceNotes: Array<{
      date: Date;
      technician: string;
      notes: string;
      type: string;
    }>;
  };
  alerts: Array<{
    id: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    timestamp: Date;
    resolved: boolean;
    resolvedAt?: Date;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISensorDataDocument extends Document {
  deviceId: string;
  userId: string;
  farmId: string;
  timestamp: Date;
  dataType: SensorDataType;
  value: number | string | boolean | Record<string, any>;
  unit: string;
  quality: 'good' | 'fair' | 'poor' | 'error';
  location?: ILocation;
  metadata: {
    batteryLevel?: number;
    signalStrength?: number;
    sensorId?: string;
    rawValue?: any;
    calibrated: boolean;
  };
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

export interface IAlertDocument extends Document {
  alertId: string;
  deviceId: string;
  userId: string;
  farmId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggered: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  triggerConditions: {
    dataType: SensorDataType;
    threshold: number;
    operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
    duration?: number; // seconds the condition must persist
  };
  actions: Array<{
    type: 'notification' | 'irrigation' | 'automation';
    executed: boolean;
    executedAt?: Date;
    details: Record<string, any>;
  }>;
  suppressUntil?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutomationRuleDocument extends Document {
  ruleId: string;
  name: string;
  description: string;
  userId: string;
  farmId: string;
  deviceIds: string[];
  isActive: boolean;
  conditions: Array<{
    dataType: SensorDataType;
    operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
    value: number;
    duration?: number; // seconds
  }>;
  actions: Array<{
    type: 'irrigation' | 'notification' | 'device_control';
    deviceId?: string;
    parameters: Record<string, any>;
    delay?: number; // seconds
  }>;
  schedule?: {
    startTime?: string; // HH:mm format
    endTime?: string; // HH:mm format
    daysOfWeek?: number[]; // 0-6, where 0 is Sunday
    timezone?: string;
  };
  executionCount: number;
  lastExecuted?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDataAggregationDocument extends Document {
  deviceId: string;
  userId: string;
  farmId: string;
  dataType: SensorDataType;
  period: 'hour' | 'day' | 'week' | 'month';
  startTime: Date;
  endTime: Date;
  statistics: {
    count: number;
    sum: number;
    average: number;
    minimum: number;
    maximum: number;
    stdDeviation?: number;
  };
  values: Array<{
    timestamp: Date;
    value: number;
  }>;
  createdAt: Date;
}

// Mongoose Schemas
const LocationSchema = new Schema<ILocation>({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(v: number[]) {
        return v.length === 2;
      },
      message: 'Coordinates must contain exactly 2 numbers [longitude, latitude]'
    }
  },
  altitude: { type: Number }
});

const DeviceSchema = new Schema<IDeviceDocument>({
  deviceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: Object.values(DeviceType), required: true },
  model: { type: String, required: true },
  manufacturer: { type: String, required: true },
  firmwareVersion: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  location: { type: LocationSchema, required: true },
  zone: { type: String, index: true },
  status: { type: String, enum: Object.values(DeviceStatus), default: DeviceStatus.OFFLINE },
  lastSeen: { type: Date, default: Date.now },
  batteryLevel: { type: Number, min: 0, max: 100 },
  signalStrength: { type: Number, min: -120, max: 0 },
  configuration: {
    reportingInterval: { type: Number, default: 300 }, // 5 minutes
    thresholds: { type: Schema.Types.Mixed, default: {} },
    calibration: { type: Schema.Types.Mixed, default: {} },
    settings: { type: Schema.Types.Mixed, default: {} }
  },
  connectivity: {
    protocol: { type: String, enum: ['mqtt', 'http', 'lorawan', 'zigbee', 'wifi'], required: true },
    networkId: String,
    endpoint: String,
    credentials: { type: Schema.Types.Mixed, default: {} }
  },
  maintenance: {
    installDate: { type: Date, default: Date.now },
    lastMaintenance: Date,
    nextMaintenance: Date,
    maintenanceNotes: [{
      date: { type: Date, default: Date.now },
      technician: String,
      notes: String,
      type: String
    }]
  },
  alerts: [{
    id: { type: String, required: true },
    type: { type: String, enum: Object.values(AlertType), required: true },
    severity: { type: String, enum: Object.values(AlertSeverity), required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: Date
  }],
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, farmId: 1 },
    { location: '2dsphere' },
    { status: 1 },
    { type: 1 },
    { lastSeen: 1 }
  ]
});

const SensorDataSchema = new Schema<ISensorDataDocument>({
  deviceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, index: true },
  dataType: { type: String, enum: Object.values(SensorDataType), required: true },
  value: { type: Schema.Types.Mixed, required: true },
  unit: { type: String, required: true },
  quality: { type: String, enum: ['good', 'fair', 'poor', 'error'], default: 'good' },
  location: LocationSchema,
  metadata: {
    batteryLevel: { type: Number, min: 0, max: 100 },
    signalStrength: { type: Number, min: -120, max: 0 },
    sensorId: String,
    rawValue: Schema.Types.Mixed,
    calibrated: { type: Boolean, default: false }
  },
  processed: { type: Boolean, default: false },
  processedAt: Date
}, {
  timestamps: { createdAt: true, updatedAt: false },
  indexes: [
    { deviceId: 1, timestamp: -1 },
    { userId: 1, farmId: 1, timestamp: -1 },
    { dataType: 1, timestamp: -1 },
    { timestamp: 1 }, // TTL index can be added
    { processed: 1 }
  ]
});

const AlertSchema = new Schema<IAlertDocument>({
  alertId: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(AlertType), required: true },
  severity: { type: String, enum: Object.values(AlertSeverity), required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  triggered: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: String,
  triggerConditions: {
    dataType: { type: String, enum: Object.values(SensorDataType), required: true },
    threshold: { type: Number, required: true },
    operator: { type: String, enum: ['>', '<', '=', '!=', '>=', '<='], required: true },
    duration: Number
  },
  actions: [{
    type: { type: String, enum: ['notification', 'irrigation', 'automation'], required: true },
    executed: { type: Boolean, default: false },
    executedAt: Date,
    details: { type: Schema.Types.Mixed, default: {} }
  }],
  suppressUntil: Date,
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, farmId: 1, resolved: 1 },
    { deviceId: 1, resolved: 1 },
    { type: 1, severity: 1 },
    { triggered: -1 }
  ]
});

const AutomationRuleSchema = new Schema<IAutomationRuleDocument>({
  ruleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  deviceIds: [{ type: String, index: true }],
  isActive: { type: Boolean, default: true },
  conditions: [{
    dataType: { type: String, enum: Object.values(SensorDataType), required: true },
    operator: { type: String, enum: ['>', '<', '=', '!=', '>=', '<='], required: true },
    value: { type: Number, required: true },
    duration: Number
  }],
  actions: [{
    type: { type: String, enum: ['irrigation', 'notification', 'device_control'], required: true },
    deviceId: String,
    parameters: { type: Schema.Types.Mixed, required: true },
    delay: { type: Number, default: 0 }
  }],
  schedule: {
    startTime: String,
    endTime: String,
    daysOfWeek: [Number],
    timezone: { type: String, default: 'UTC' }
  },
  executionCount: { type: Number, default: 0 },
  lastExecuted: Date,
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, farmId: 1 },
    { isActive: 1 },
    { deviceIds: 1 }
  ]
});

const DataAggregationSchema = new Schema<IDataAggregationDocument>({
  deviceId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  dataType: { type: String, enum: Object.values(SensorDataType), required: true },
  period: { type: String, enum: ['hour', 'day', 'week', 'month'], required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  statistics: {
    count: { type: Number, required: true },
    sum: { type: Number, required: true },
    average: { type: Number, required: true },
    minimum: { type: Number, required: true },
    maximum: { type: Number, required: true },
    stdDeviation: Number
  },
  values: [{
    timestamp: { type: Date, required: true },
    value: { type: Number, required: true }
  }]
}, {
  timestamps: { createdAt: true, updatedAt: false },
  indexes: [
    { deviceId: 1, dataType: 1, period: 1, startTime: -1 },
    { userId: 1, farmId: 1, period: 1, startTime: -1 }
  ]
});

// Add TTL index for sensor data (auto-delete old data)
SensorDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

// Virtual fields
DeviceSchema.virtual('isOnline').get(function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.status === DeviceStatus.ONLINE && this.lastSeen > fiveMinutesAgo;
});

DeviceSchema.virtual('activeAlerts').get(function() {
  return this.alerts.filter(alert => !alert.resolved);
});

// Models
export const Device = mongoose.model<IDeviceDocument>('Device', DeviceSchema);
export const SensorData = mongoose.model<ISensorDataDocument>('SensorData', SensorDataSchema);
export const Alert = mongoose.model<IAlertDocument>('Alert', AlertSchema);
export const AutomationRule = mongoose.model<IAutomationRuleDocument>('AutomationRule', AutomationRuleSchema);
export const DataAggregation = mongoose.model<IDataAggregationDocument>('DataAggregation', DataAggregationSchema);

// Helper types for API responses
export interface DeviceSummary {
  deviceId: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  lastSeen: Date;
  batteryLevel?: number;
  location: ILocation;
  activeAlerts: number;
  isOnline: boolean;
}

export interface SensorDataSummary {
  timestamp: Date;
  dataType: SensorDataType;
  value: number | string;
  unit: string;
  quality: string;
}

// Validation helpers
export const validateDeviceType = (type: string): type is DeviceType => {
  return Object.values(DeviceType).includes(type as DeviceType);
};

export const validateSensorDataType = (type: string): type is SensorDataType => {
  return Object.values(SensorDataType).includes(type as SensorDataType);
};

export const validateAlertType = (type: string): type is AlertType => {
  return Object.values(AlertType).includes(type as AlertType);
};