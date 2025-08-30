import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { ServiceConfigFactory, EnvironmentUtils } from '@daorsagro/config';
import { Logger } from '@daorsagro/utils';

import { ErrorHandlerMiddleware } from './middleware/error-handler.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';

/**
 * Weather Service Application
 * Provides weather data and forecasts for agricultural planning
 */
class WeatherServiceApp {
  private app: express.Application;
  private logger: Logger;
  private config: any;

  constructor() {
    this.app = express();
    this.logger = new Logger('weather-service');
    this.config = ServiceConfigFactory.create('weather-service', 3009);
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [\"'self'\"],
          styleSrc: [\"'self'\", \"'unsafe-inline'\"],
          scriptSrc: [\"'self'\"],
          imgSrc: [\"'self'\", \"data:\", \"https:\"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: EnvironmentUtils.getArray('CORS_ORIGIN', ['http://localhost:3000']),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    this.app.use(morgan('combined', {
      stream: { write: (message) => this.logger.info(message.trim()) }
    }));

    // Rate limiting
    this.setupRateLimiting();

    // Request ID
    this.app.use((req, res, next) => {
      req.headers['x-request-id'] = req.headers['x-request-id'] || 
        require('crypto').randomUUID();
      res.setHeader('X-Request-ID', req.headers['x-request-id']);
      next();
    });
  }

  /**
   * Setup rate limiting
   */
  private setupRateLimiting(): void {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // requests per window
      message: {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use('/', limiter);
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'weather-service',
        version: this.config.version || '1.0.0'
      });
    });

    // Service info
    this.app.get('/', (req, res) => {
      res.json({
        service: 'weather-service',
        version: this.config.version || '1.0.0',
        environment: this.config.environment,
        timestamp: new Date().toISOString(),
        description: 'Weather Data and Forecast Service for Agriculture'
      });
    });

    // Current weather endpoint
    this.app.get('/api/v1/weather/current', AuthMiddleware.authenticate, async (req, res) => {
      try {
        const { lat, lng, farmId } = req.query;
        const userId = (req as any).user?.userId;
        
        this.logger.info('Current weather requested', {
          requestId: req.headers['x-request-id'],
          userId,
          coordinates: { lat, lng },
          farmId
        });

        // Mock current weather data
        const currentWeather = {
          location: {
            name: farmId ? `Farm ${farmId}` : 'Farm Location',
            coordinates: {
              lat: lat ? parseFloat(lat as string) : 40.7128,
              lng: lng ? parseFloat(lng as string) : -74.0060
            }
          },
          current: {
            timestamp: new Date().toISOString(),
            temperature: Math.round(15 + Math.random() * 15), // 15-30°C
            humidity: Math.round(40 + Math.random() * 40), // 40-80%
            windSpeed: Math.round(5 + Math.random() * 15), // 5-20 km/h
            windDirection: Math.round(Math.random() * 360), // 0-360°
            pressure: Math.round(1000 + Math.random() * 50), // 1000-1050 hPa
            visibility: Math.round(8 + Math.random() * 7), // 8-15 km
            uvIndex: Math.round(1 + Math.random() * 10), // 1-11
            condition: this.getRandomWeatherCondition(),
            precipitation: Math.random() > 0.7 ? Math.round(Math.random() * 10) : 0, // 30% chance of rain
            feelsLike: Math.round(15 + Math.random() * 15),
            dewPoint: Math.round(10 + Math.random() * 10)
          },
          alerts: this.generateWeatherAlerts()
        };

        res.json({
          success: true,
          data: currentWeather,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        this.logger.error('Failed to get current weather:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'WEATHER_ERROR',
            message: 'Failed to retrieve weather data'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      }
    });

    // Weather forecast endpoint
    this.app.get('/api/v1/weather/forecast', AuthMiddleware.authenticate, async (req, res) => {
      try {
        const { lat, lng, days = 7 } = req.query;
        const userId = (req as any).user?.userId;
        
        const forecast = {
          location: {
            coordinates: {
              lat: lat ? parseFloat(lat as string) : 40.7128,
              lng: lng ? parseFloat(lng as string) : -74.0060
            }
          },
          forecast: Array.from({ length: parseInt(days as string) }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            return {
              date: date.toISOString().split('T')[0],
              temperature: {
                min: Math.round(10 + Math.random() * 10),
                max: Math.round(20 + Math.random() * 15)
              },
              humidity: Math.round(40 + Math.random() * 40),
              windSpeed: Math.round(5 + Math.random() * 15),
              precipitation: Math.random() > 0.6 ? Math.round(Math.random() * 15) : 0,
              condition: this.getRandomWeatherCondition(),
              uvIndex: Math.round(1 + Math.random() * 10)
            };
          })
        };

        res.json({
          success: true,
          data: forecast,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        this.logger.error('Failed to get weather forecast:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'WEATHER_FORECAST_ERROR',
            message: 'Failed to retrieve weather forecast'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      }
    });

    // Agricultural weather insights endpoint
    this.app.get('/api/v1/weather/insights', AuthMiddleware.authenticate, async (req, res) => {
      try {
        const insights = {
          growingConditions: this.generateGrowingConditions(),
          recommendations: this.generateWeatherRecommendations(),
          alerts: this.generateWeatherAlerts(),
          soilConditions: {
            moisture: 'optimal',
            temperature: 'suitable',
            warning: null
          }
        };

        res.json({
          success: true,
          data: insights,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      } catch (error) {
        this.logger.error('Failed to get weather insights:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'WEATHER_INSIGHTS_ERROR',
            message: 'Failed to retrieve weather insights'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        });
      }
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id']
        }
      });
    });

    // Global error handler
    this.app.use(ErrorHandlerMiddleware.handle);
  }

  /**
   * Helper: Get random weather condition
   */
  private getRandomWeatherCondition(): string {
    const conditions = [
      'sunny', 'partly_cloudy', 'cloudy', 'overcast',
      'light_rain', 'rain', 'thunderstorm', 'fog', 'clear'
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  /**
   * Helper: Generate growing conditions
   */
  private generateGrowingConditions(): any {
    return {
      overall: 'good',
      temperature: 'optimal',
      moisture: 'adequate',
      sunlight: 'sufficient',
      recommendation: 'Conditions are favorable for most crops'
    };
  }

  /**
   * Helper: Generate weather recommendations
   */
  private generateWeatherRecommendations(): string[] {
    const recommendations = [
      'Consider irrigation in 2-3 days due to low precipitation forecast',
      'Good conditions for planting this week',
      'Monitor wind speeds for spray applications',
      'Optimal temperature range for crop growth'
    ];
    return recommendations.slice(0, 2 + Math.floor(Math.random() * 2));
  }

  /**
   * Helper: Generate weather alerts
   */
  private generateWeatherAlerts(): any[] {
    const alerts = [];
    
    if (Math.random() > 0.8) {
      alerts.push({
        id: `alert-weather-${Date.now()}`,
        type: 'frost_warning',
        severity: 'medium',
        message: 'Frost expected tomorrow morning. Protect sensitive crops.',
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    if (Math.random() > 0.9) {
      alerts.push({
        id: `alert-weather-${Date.now() + 1}`,
        type: 'high_wind',
        severity: 'low',
        message: 'High winds expected. Avoid pesticide applications.',
        validUntil: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return alerts;
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Start HTTP server
      const port = this.config.port;
      this.app.listen(port, () => {
        this.logger.info(`Weather Service running on port ${port}`);
        this.logger.info(`Environment: ${this.config.environment}`);
      });

      // Setup graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      this.logger.error('Failed to start Weather Service:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`${signal} received, shutting down gracefully`);
      
      try {
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Start the service
if (require.main === module) {
  const service = new WeatherServiceApp();
  service.start();
}

export default WeatherServiceApp;