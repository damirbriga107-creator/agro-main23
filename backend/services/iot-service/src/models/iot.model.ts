export interface IoTDevice {
  _id?: string;
  deviceId: string;
  name: string;
  type: 'sensor' | 'actuator' | 'gateway' | 'camera';
  status: 'online' | 'offline' | 'maintenance' | 'error';
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
    farmId: string;
  };
  owner: {
    userId: string;
    farmId: string;
  };
  specifications: {
    model: string;
    manufacturer: string;
    firmware: string;
    sensors: string[];
    capabilities: string[];
  };
  configuration: {
    reportingInterval: number; // seconds
    thresholds: Record<string, any>;
    settings: Record<string, any>;
  };
  connectivity: {
    protocol: 'mqtt' | 'http' | 'lora' | 'zigbee';
    connectionString: string;
    lastHeartbeat?: Date;
    signalStrength?: number;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastDataReceived?: Date;
    version: string;
    tags: string[];
  };
}

export interface SensorReading {
  _id?: string;
  deviceId: string;
  timestamp: Date;
  data: {
    temperature?: number;
    humidity?: number;
    soil_moisture?: number;
    ph?: number;
    light?: number;
    nitrogen?: number;
    phosphorus?: number;
    potassium?: number;
    battery?: number;
    signal_strength?: number;
    [key: string]: any;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  quality: {
    score: number; // 0-100
    issues: string[];
    validated: boolean;
  };
  processed: {
    processed: boolean;
    processedAt?: Date;
    algorithms: string[];
  };
  metadata: {
    source: 'device' | 'api' | 'simulation';
    version: string;
    correlationId?: string;
  };
}

export interface DeviceAlert {
  _id?: string;
  deviceId: string;
  alertType: 'threshold' | 'connectivity' | 'battery' | 'maintenance' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: {
    sensorType?: string;
    currentValue?: number;
    thresholdValue?: number;
    batteryLevel?: number;
    lastSeen?: Date;
  };
  status: 'active' | 'acknowledged' | 'resolved';
  timestamps: {
    created: Date;
    acknowledged?: Date;
    resolved?: Date;
  };
  assignedTo?: string;
  actions: {
    actionType: string;
    timestamp: Date;
    userId: string;
    details: Record<string, any>;
  }[];
}

export interface SensorThreshold {
  _id?: string;
  deviceId: string;
  sensorType: string;
  thresholds: {
    min?: {
      value: number;
      enabled: boolean;
      severity: 'low' | 'medium' | 'high' | 'critical';
    };
    max?: {
      value: number;
      enabled: boolean;
      severity: 'low' | 'medium' | 'high' | 'critical';
    };
    rate?: {
      value: number; // rate of change per minute
      enabled: boolean;
      severity: 'low' | 'medium' | 'high' | 'critical';
    };
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    webhook?: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceLog {
  _id?: string;
  deviceId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  message: string;
  data?: Record<string, any>;
  source: 'device' | 'system' | 'user';
  correlationId?: string;
}

export interface IoTSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  devicesByType: Record<string, number>;
  devicesByStatus: Record<string, number>;
  totalReadings24h: number;
  activeAlerts: number;
  averageDataQuality: number;
  lastUpdate: Date;
}

export interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastHeartbeat: Date;
  lastDataReceived?: Date;
  connectivity: {
    signalStrength: number;
    protocol: string;
    latency?: number;
  };
  battery?: {
    level: number;
    voltage?: number;
    status: 'good' | 'low' | 'critical';
  };
  uptime: {
    current: number; // seconds
    total: number; // seconds
    lastRestart?: Date;
  };
  performance: {
    dataRate: number; // readings per hour
    errorRate: number; // percentage
    averageLatency: number; // milliseconds
  };
}

export interface DataQualityMetrics {
  deviceId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    completeness: number; // percentage
    accuracy: number; // percentage
    consistency: number; // percentage
    timeliness: number; // percentage
    overall: number; // percentage
  };
  issues: {
    missingData: number;
    outliers: number;
    duplicates: number;
    delays: number;
  };
  recommendations: string[];
}

export interface AggregatedSensorData {
  deviceId: string;
  sensorType: string;
  aggregationType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  period: {
    start: Date;
    end: Date;
  };
  statistics: {
    min: number;
    max: number;
    avg: number;
    median: number;
    count: number;
    stdDev: number;
  };
  dataPoints: {
    timestamp: Date;
    value: number;
    quality: number;
  }[];
}

export interface StreamInfo {
  userId: string;
  activeStreams: {
    deviceId: string;
    deviceName: string;
    status: 'active' | 'paused' | 'error';
    dataRate: number; // readings per minute
    lastUpdate: Date;
  }[];
  totalStreams: number;
  totalDataRate: number;
  websocketConnections: number;
  mqttConnections: number;
}