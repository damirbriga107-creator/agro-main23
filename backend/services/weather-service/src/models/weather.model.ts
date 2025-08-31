import mongoose, { Document, Schema } from 'mongoose';

// Enums
export enum WeatherProvider {
  OPENWEATHERMAP = 'openweathermap',
  WEATHERAPI = 'weatherapi',
  ACCUWEATHER = 'accuweather',
  NOAA = 'noaa',
  FARMER_WEATHER = 'farmer_weather'
}

export enum AlertType {
  FROST_WARNING = 'frost_warning',
  HEAVY_RAIN = 'heavy_rain',
  DROUGHT_RISK = 'drought_risk',
  HIGH_WIND = 'high_wind',
  HAIL_RISK = 'hail_risk',
  EXTREME_TEMPERATURE = 'extreme_temperature',
  SEVERE_STORM = 'severe_storm',
  HUMIDITY_EXTREME = 'humidity_extreme',
  UV_WARNING = 'uv_warning'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe',
  EXTREME = 'extreme'
}

export enum WeatherCondition {
  CLEAR = 'clear',
  PARTLY_CLOUDY = 'partly_cloudy',
  CLOUDY = 'cloudy',
  OVERCAST = 'overcast',
  RAIN = 'rain',
  HEAVY_RAIN = 'heavy_rain',
  DRIZZLE = 'drizzle',
  SNOW = 'snow',
  SLEET = 'sleet',
  THUNDERSTORM = 'thunderstorm',
  FOG = 'fog',
  HAIL = 'hail',
  DUST = 'dust',
  TORNADO = 'tornado'
}

// Interfaces
export interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
  name?: string;
  address?: string;
}

export interface ICurrentWeatherDocument extends Document {
  locationId: string;
  farmId: string;
  userId: string;
  location: ILocation;
  provider: WeatherProvider;
  timestamp: Date;
  
  // Temperature data
  temperature: number; // Celsius
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  
  // Atmospheric data
  pressure: number; // hPa
  humidity: number; // percentage
  visibility: number; // meters
  dewPoint: number; // Celsius
  
  // Wind data
  windSpeed: number; // m/s
  windDirection: number; // degrees
  windGust?: number; // m/s
  
  // Precipitation
  precipitation: number; // mm
  precipitationProbability: number; // percentage
  
  // Sky conditions
  condition: WeatherCondition;
  description: string;
  cloudCover: number; // percentage
  
  // Solar data
  uvIndex?: number;
  solarRadiation?: number; // W/m²
  sunshine?: number; // hours
  
  // Agricultural specific
  soilTemperature?: number; // Celsius
  leafWetness?: number; // percentage
  evapotranspiration?: number; // mm
  
  // Quality and metadata
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  metadata: {
    provider: string;
    stationId?: string;
    distance?: number; // km to weather station
    elevation?: number; // meters
    timezone: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeatherForecastDocument extends Document {
  locationId: string;
  farmId: string;
  userId: string;
  location: ILocation;
  provider: WeatherProvider;
  generatedAt: Date;
  
  // Forecast details
  forecastDate: Date;
  period: 'hourly' | 'daily' | '3hourly';
  
  // Temperature forecast
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  feelsLike: number;
  
  // Atmospheric forecast
  pressure: number;
  humidity: number;
  
  // Wind forecast
  windSpeed: number;
  windDirection: number;
  windGust?: number;
  
  // Precipitation forecast
  precipitation: number;
  precipitationProbability: number;
  precipitationType?: 'rain' | 'snow' | 'sleet' | 'hail';
  
  // Sky conditions
  condition: WeatherCondition;
  description: string;
  cloudCover: number;
  
  // Solar forecast
  uvIndex?: number;
  solarRadiation?: number;
  
  // Agricultural forecast
  soilTemperature?: number;
  evapotranspiration?: number;
  growingDegreeDays?: number;
  
  // Probability and confidence
  confidence: number; // 0-100
  
  metadata: {
    provider: string;
    model?: string;
    resolution?: string;
    updateFrequency?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeatherAlertDocument extends Document {
  alertId: string;
  locationId: string;
  farmId: string;
  userId: string;
  location: ILocation;
  
  // Alert details
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  
  // Timing
  issuedAt: Date;
  effectiveFrom: Date;
  expiresAt: Date;
  
  // Weather conditions that triggered alert
  triggerConditions: {
    parameter: string;
    threshold: number;
    operator: '>' | '<' | '>=' | '<=' | '=' | '!=';
    duration?: number; // minutes
  }[];
  
  // Current conditions
  currentValues: Record<string, number>;
  
  // Recommended actions
  recommendations: string[];
  
  // Status
  isActive: boolean;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  
  // Notifications
  notificationsSent: boolean;
  notificationChannels: string[];
  
  metadata: {
    provider: string;
    source: 'automatic' | 'manual' | 'external';
    confidence?: number;
    urgency?: 'immediate' | 'expected' | 'future';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeatherStationDocument extends Document {
  stationId: string;
  name: string;
  location: ILocation;
  
  // Station details
  type: 'personal' | 'professional' | 'government' | 'agricultural';
  owner: string;
  status: 'active' | 'inactive' | 'maintenance';
  
  // Capabilities
  parameters: string[];
  updateFrequency: number; // minutes
  accuracy: Record<string, number>;
  
  // Connection info
  connectionType: 'wifi' | 'cellular' | 'satellite' | 'radio';
  lastReporting: Date;
  
  // Coverage area
  coverageRadius: number; // km
  elevation: number; // meters
  
  // Associated farms
  farmIds: string[];
  
  metadata: {
    manufacturer?: string;
    model?: string;
    installDate?: Date;
    calibrationDate?: Date;
    maintainer?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IAgriculturalIndicesDocument extends Document {
  locationId: string;
  farmId: string;
  userId: string;
  calculatedAt: Date;
  period: Date;
  
  // Growing indices
  growingDegreeDays: {
    accumulated: number;
    baseTemperature: number;
    cropType?: string;
  };
  
  // Water indices
  evapotranspiration: {
    reference: number; // mm
    crop: number; // mm
    deficit: number; // mm
  };
  
  // Stress indices
  heatStressIndex: number;
  coldStressIndex: number;
  droughtStressIndex: number;
  
  // Phenology
  phenologyStage?: {
    crop: string;
    stage: string;
    daysToNextStage: number;
  };
  
  // Disease pressure
  diseasePressure: {
    fungal: number; // 0-100
    bacterial: number; // 0-100
    viral: number; // 0-100
  };
  
  // Pest pressure
  pestPressure: {
    insects: number; // 0-100
    mites: number; // 0-100
    nematodes: number; // 0-100
  };
  
  // Spray recommendations
  sprayConditions: {
    favorable: boolean;
    windSpeed: number;
    temperature: number;
    humidity: number;
    recommendation: string;
  };
  
  metadata: {
    cropType?: string;
    variety?: string;
    plantingDate?: Date;
    calculationMethod: string;
  };
  
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
  name: String,
  address: String
});

const CurrentWeatherSchema = new Schema<ICurrentWeatherDocument>({
  locationId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  location: { type: LocationSchema, required: true },
  provider: { type: String, enum: Object.values(WeatherProvider), required: true },
  timestamp: { type: Date, required: true, index: true },
  
  // Temperature
  temperature: { type: Number, required: true },
  feelsLike: { type: Number, required: true },
  tempMin: { type: Number, required: true },
  tempMax: { type: Number, required: true },
  
  // Atmospheric
  pressure: { type: Number, required: true },
  humidity: { type: Number, required: true, min: 0, max: 100 },
  visibility: { type: Number, default: 10000 },
  dewPoint: { type: Number, required: true },
  
  // Wind
  windSpeed: { type: Number, required: true, min: 0 },
  windDirection: { type: Number, required: true, min: 0, max: 360 },
  windGust: { type: Number, min: 0 },
  
  // Precipitation
  precipitation: { type: Number, default: 0, min: 0 },
  precipitationProbability: { type: Number, default: 0, min: 0, max: 100 },
  
  // Sky
  condition: { type: String, enum: Object.values(WeatherCondition), required: true },
  description: { type: String, required: true },
  cloudCover: { type: Number, required: true, min: 0, max: 100 },
  
  // Solar
  uvIndex: { type: Number, min: 0, max: 15 },
  solarRadiation: { type: Number, min: 0 },
  sunshine: { type: Number, min: 0, max: 24 },
  
  // Agricultural
  soilTemperature: Number,
  leafWetness: { type: Number, min: 0, max: 100 },
  evapotranspiration: { type: Number, min: 0 },
  
  // Quality
  quality: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
  metadata: {
    provider: { type: String, required: true },
    stationId: String,
    distance: Number,
    elevation: Number,
    timezone: { type: String, default: 'UTC' }
  }
}, {
  timestamps: true,
  indexes: [
    { locationId: 1, timestamp: -1 },
    { farmId: 1, timestamp: -1 },
    { userId: 1, timestamp: -1 },
    { location: '2dsphere' },
    { timestamp: 1 } // TTL index
  ]
});

const WeatherForecastSchema = new Schema<IWeatherForecastDocument>({
  locationId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  location: { type: LocationSchema, required: true },
  provider: { type: String, enum: Object.values(WeatherProvider), required: true },
  generatedAt: { type: Date, required: true },
  
  forecastDate: { type: Date, required: true, index: true },
  period: { type: String, enum: ['hourly', 'daily', '3hourly'], required: true },
  
  // Weather data
  temperature: { type: Number, required: true },
  temperatureMin: { type: Number, required: true },
  temperatureMax: { type: Number, required: true },
  feelsLike: { type: Number, required: true },
  
  pressure: { type: Number, required: true },
  humidity: { type: Number, required: true, min: 0, max: 100 },
  
  windSpeed: { type: Number, required: true, min: 0 },
  windDirection: { type: Number, required: true, min: 0, max: 360 },
  windGust: { type: Number, min: 0 },
  
  precipitation: { type: Number, default: 0, min: 0 },
  precipitationProbability: { type: Number, default: 0, min: 0, max: 100 },
  precipitationType: { type: String, enum: ['rain', 'snow', 'sleet', 'hail'] },
  
  condition: { type: String, enum: Object.values(WeatherCondition), required: true },
  description: { type: String, required: true },
  cloudCover: { type: Number, required: true, min: 0, max: 100 },
  
  uvIndex: { type: Number, min: 0, max: 15 },
  solarRadiation: { type: Number, min: 0 },
  
  soilTemperature: Number,
  evapotranspiration: { type: Number, min: 0 },
  growingDegreeDays: { type: Number, min: 0 },
  
  confidence: { type: Number, required: true, min: 0, max: 100 },
  
  metadata: {
    provider: { type: String, required: true },
    model: String,
    resolution: String,
    updateFrequency: String
  }
}, {
  timestamps: true,
  indexes: [
    { locationId: 1, forecastDate: 1, period: 1 },
    { farmId: 1, forecastDate: 1 },
    { userId: 1, forecastDate: 1 },
    { forecastDate: 1 }
  ]
});

const WeatherAlertSchema = new Schema<IWeatherAlertDocument>({
  alertId: { type: String, required: true, unique: true },
  locationId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  location: { type: LocationSchema, required: true },
  
  type: { type: String, enum: Object.values(AlertType), required: true },
  severity: { type: String, enum: Object.values(AlertSeverity), required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  
  issuedAt: { type: Date, default: Date.now },
  effectiveFrom: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  
  triggerConditions: [{
    parameter: { type: String, required: true },
    threshold: { type: Number, required: true },
    operator: { type: String, enum: ['>', '<', '>=', '<=', '=', '!='], required: true },
    duration: Number
  }],
  
  currentValues: { type: Schema.Types.Mixed, default: {} },
  recommendations: [String],
  
  isActive: { type: Boolean, default: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date,
  acknowledgedBy: String,
  
  notificationsSent: { type: Boolean, default: false },
  notificationChannels: [String],
  
  metadata: {
    provider: { type: String, required: true },
    source: { type: String, enum: ['automatic', 'manual', 'external'], default: 'automatic' },
    confidence: { type: Number, min: 0, max: 100 },
    urgency: { type: String, enum: ['immediate', 'expected', 'future'] }
  }
}, {
  timestamps: true,
  indexes: [
    { farmId: 1, isActive: 1 },
    { userId: 1, isActive: 1 },
    { type: 1, severity: 1 },
    { effectiveFrom: 1, expiresAt: 1 },
    { isActive: 1, acknowledged: 1 }
  ]
});

const WeatherStationSchema = new Schema<IWeatherStationDocument>({
  stationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { type: LocationSchema, required: true },
  
  type: { type: String, enum: ['personal', 'professional', 'government', 'agricultural'], required: true },
  owner: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  
  parameters: [String],
  updateFrequency: { type: Number, default: 15 }, // minutes
  accuracy: { type: Schema.Types.Mixed, default: {} },
  
  connectionType: { type: String, enum: ['wifi', 'cellular', 'satellite', 'radio'], required: true },
  lastReporting: { type: Date, default: Date.now },
  
  coverageRadius: { type: Number, default: 10 }, // km
  elevation: { type: Number, required: true },
  
  farmIds: [{ type: String, index: true }],
  
  metadata: {
    manufacturer: String,
    model: String,
    installDate: Date,
    calibrationDate: Date,
    maintainer: String
  }
}, {
  timestamps: true,
  indexes: [
    { location: '2dsphere' },
    { farmIds: 1 },
    { status: 1 },
    { type: 1 }
  ]
});

const AgriculturalIndicesSchema = new Schema<IAgriculturalIndicesDocument>({
  locationId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  calculatedAt: { type: Date, default: Date.now },
  period: { type: Date, required: true, index: true },
  
  growingDegreeDays: {
    accumulated: { type: Number, default: 0 },
    baseTemperature: { type: Number, default: 10 },
    cropType: String
  },
  
  evapotranspiration: {
    reference: { type: Number, default: 0 },
    crop: { type: Number, default: 0 },
    deficit: { type: Number, default: 0 }
  },
  
  heatStressIndex: { type: Number, default: 0 },
  coldStressIndex: { type: Number, default: 0 },
  droughtStressIndex: { type: Number, default: 0 },
  
  phenologyStage: {
    crop: String,
    stage: String,
    daysToNextStage: Number
  },
  
  diseasePressure: {
    fungal: { type: Number, default: 0, min: 0, max: 100 },
    bacterial: { type: Number, default: 0, min: 0, max: 100 },
    viral: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  pestPressure: {
    insects: { type: Number, default: 0, min: 0, max: 100 },
    mites: { type: Number, default: 0, min: 0, max: 100 },
    nematodes: { type: Number, default: 0, min: 0, max: 100 }
  },
  
  sprayConditions: {
    favorable: { type: Boolean, default: false },
    windSpeed: { type: Number, default: 0 },
    temperature: { type: Number, default: 0 },
    humidity: { type: Number, default: 0 },
    recommendation: { type: String, default: 'not_recommended' }
  },
  
  metadata: {
    cropType: String,
    variety: String,
    plantingDate: Date,
    calculationMethod: { type: String, default: 'standard' }
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  indexes: [
    { farmId: 1, period: -1 },
    { userId: 1, period: -1 },
    { period: -1 }
  ]
});

// Add TTL indexes for data cleanup
CurrentWeatherSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days
WeatherForecastSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 }); // 14 days
WeatherAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-expire

// Virtual fields
CurrentWeatherSchema.virtual('temperatureF').get(function() {
  return (this.temperature * 9/5) + 32;
});

CurrentWeatherSchema.virtual('windSpeedMph').get(function() {
  return this.windSpeed * 2.237;
});

WeatherAlertSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Models
export const CurrentWeather = mongoose.model<ICurrentWeatherDocument>('CurrentWeather', CurrentWeatherSchema);
export const WeatherForecast = mongoose.model<IWeatherForecastDocument>('WeatherForecast', WeatherForecastSchema);
export const WeatherAlert = mongoose.model<IWeatherAlertDocument>('WeatherAlert', WeatherAlertSchema);
export const WeatherStation = mongoose.model<IWeatherStationDocument>('WeatherStation', WeatherStationSchema);
export const AgriculturalIndices = mongoose.model<IAgriculturalIndicesDocument>('AgriculturalIndices', AgriculturalIndicesSchema);

// Helper types for API responses
export interface WeatherSummary {
  location: ILocation;
  current: {
    temperature: number;
    condition: WeatherCondition;
    description: string;
    humidity: number;
    windSpeed: number;
    precipitation: number;
  };
  forecast: {
    today: {
      tempMin: number;
      tempMax: number;
      condition: WeatherCondition;
      precipitation: number;
    };
    tomorrow: {
      tempMin: number;
      tempMax: number;
      condition: WeatherCondition;
      precipitation: number;
    };
  };
  alerts: number;
  lastUpdated: Date;
}

// Validation helpers
export const validateWeatherProvider = (provider: string): provider is WeatherProvider => {
  return Object.values(WeatherProvider).includes(provider as WeatherProvider);
};

export const validateAlertType = (type: string): type is AlertType => {
  return Object.values(AlertType).includes(type as AlertType);
};

export const validateWeatherCondition = (condition: string): condition is WeatherCondition => {
  return Object.values(WeatherCondition).includes(condition as WeatherCondition);
};