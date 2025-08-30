import { Schema, model, Document } from 'mongoose';

// Weather Data Schema
export interface IWeatherData extends Document {
  location: {
    name: string;
    farmId?: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    visibility: number;
    pressure: number;
    condition: string;
    uvIndex: number;
    rainfall: number;
    cloudCover: number;
  };
  forecast: Array<{
    date: Date;
    day: string;
    high: number;
    low: number;
    condition: string;
    precipitation: number;
    windSpeed: number;
    humidity: number;
  }>;
  alerts?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
  }>;
  agriculturalInsights?: {
    irrigation: {
      recommended: boolean;
      reason: string;
      nextRecommendation: Date;
    };
    planting: {
      conditions: 'excellent' | 'good' | 'fair' | 'poor';
      recommendations: string[];
    };
    harvesting: {
      conditions: 'excellent' | 'good' | 'fair' | 'poor';
      recommendations: string[];
    };
  };
  dataSource: string;
  userId?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WeatherDataSchema = new Schema<IWeatherData>({
  location: {
    name: { type: String, required: true },
    farmId: { type: String, index: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  current: {
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true, min: 0, max: 100 },
    windSpeed: { type: Number, required: true, min: 0 },
    windDirection: { type: Number, required: true, min: 0, max: 360 },
    visibility: { type: Number, required: true, min: 0 },
    pressure: { type: Number, required: true, min: 0 },
    condition: { type: String, required: true },
    uvIndex: { type: Number, required: true, min: 0 },
    rainfall: { type: Number, default: 0, min: 0 },
    cloudCover: { type: Number, required: true, min: 0, max: 100 }
  },
  forecast: [{
    date: { type: Date, required: true },
    day: { type: String, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    condition: { type: String, required: true },
    precipitation: { type: Number, required: true, min: 0, max: 100 },
    windSpeed: { type: Number, required: true, min: 0 },
    humidity: { type: Number, required: true, min: 0, max: 100 }
  }],
  alerts: [{
    type: { type: String, required: true },
    severity: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      required: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true }
  }],
  agriculturalInsights: {
    irrigation: {
      recommended: { type: Boolean, required: true },
      reason: { type: String, required: true },
      nextRecommendation: { type: Date, required: true }
    },
    planting: {
      conditions: { 
        type: String, 
        enum: ['excellent', 'good', 'fair', 'poor'], 
        required: true 
      },
      recommendations: [{ type: String }]
    },
    harvesting: {
      conditions: { 
        type: String, 
        enum: ['excellent', 'good', 'fair', 'poor'], 
        required: true 
      },
      recommendations: [{ type: String }]
    }
  },
  dataSource: { type: String, required: true },
  userId: { type: String, index: true },
  timestamp: { type: Date, required: true, default: Date.now }
}, {
  timestamps: true,
  collection: 'weather_data'
});

// Indexes for performance
WeatherDataSchema.index({ 'location.coordinates': '2dsphere' });
WeatherDataSchema.index({ 'location.farmId': 1, timestamp: -1 });
WeatherDataSchema.index({ userId: 1, timestamp: -1 });
WeatherDataSchema.index({ timestamp: -1 });

// Weather Alert Schema for system alerts
export interface IWeatherAlert extends Document {
  userId?: string;
  farmId?: string;
  alertType: 'storm' | 'frost' | 'drought' | 'flood' | 'high_wind' | 'extreme_temperature';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: {
    name: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  recommendations: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const WeatherAlertSchema = new Schema<IWeatherAlert>({
  userId: { type: String, index: true },
  farmId: { type: String, index: true },
  alertType: { 
    type: String, 
    enum: ['storm', 'frost', 'drought', 'flood', 'high_wind', 'extreme_temperature'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true 
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: {
    name: { type: String, required: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  isActive: { type: Boolean, default: true, index: true },
  recommendations: [{ type: String }],
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'weather_alerts'
});

// Indexes for weather alerts
WeatherAlertSchema.index({ isActive: 1, severity: 1, startTime: -1 });
WeatherAlertSchema.index({ 'location.coordinates': '2dsphere' });
WeatherAlertSchema.index({ farmId: 1, isActive: 1, startTime: -1 });

// Historical Weather Schema for trend analysis
export interface IHistoricalWeather extends Document {
  location: {
    farmId: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  date: Date;
  dailyData: {
    averageTemperature: number;
    maxTemperature: number;
    minTemperature: number;
    totalRainfall: number;
    averageHumidity: number;
    maxWindSpeed: number;
    averageWindSpeed: number;
    sunshineHours: number;
    evapotranspiration: number;
  };
  metadata?: Record<string, any>;
  createdAt: Date;
}

const HistoricalWeatherSchema = new Schema<IHistoricalWeather>({
  location: {
    farmId: { type: String, required: true, index: true },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  date: { type: Date, required: true, index: true },
  dailyData: {
    averageTemperature: { type: Number, required: true },
    maxTemperature: { type: Number, required: true },
    minTemperature: { type: Number, required: true },
    totalRainfall: { type: Number, required: true, min: 0 },
    averageHumidity: { type: Number, required: true, min: 0, max: 100 },
    maxWindSpeed: { type: Number, required: true, min: 0 },
    averageWindSpeed: { type: Number, required: true, min: 0 },
    sunshineHours: { type: Number, required: true, min: 0, max: 24 },
    evapotranspiration: { type: Number, required: true, min: 0 }
  },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'historical_weather'
});

// Indexes for historical weather
HistoricalWeatherSchema.index({ 'location.farmId': 1, date: -1 });
HistoricalWeatherSchema.index({ date: -1 });

export const WeatherData = model<IWeatherData>('WeatherData', WeatherDataSchema);
export const WeatherAlert = model<IWeatherAlert>('WeatherAlert', WeatherAlertSchema);
export const HistoricalWeather = model<IHistoricalWeather>('HistoricalWeather', HistoricalWeatherSchema);