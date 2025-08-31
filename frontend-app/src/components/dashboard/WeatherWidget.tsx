import React from 'react';
import { useQuery } from 'react-query';
import { 
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  EyeIcon,
  WindIcon,
  DropIcon
} from '@heroicons/react/24/outline';

interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  visibility: number;
  pressure: number;
  condition: string;
  uvIndex: number;
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
    precipitation: number;
  }>;
}

const WeatherWidget: React.FC = () => {
  // Mock weather data - in real app, this would fetch from weather API
  const { data: weatherData, isLoading } = useQuery<WeatherData>(
    'weather-data',
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        location: 'Farm Location',
        temperature: 24,
        humidity: 68,
        windSpeed: 12,
        visibility: 10,
        pressure: 1013,
        condition: 'partly-cloudy',
        uvIndex: 6,
        forecast: [
          { day: 'Today', high: 26, low: 18, condition: 'sunny', precipitation: 0 },
          { day: 'Tomorrow', high: 24, low: 16, condition: 'cloudy', precipitation: 20 },
          { day: 'Friday', high: 22, low: 14, condition: 'rainy', precipitation: 80 },
          { day: 'Saturday', high: 25, low: 17, condition: 'sunny', precipitation: 10 },
        ]
      };
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    }
  );

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <SunIcon className="h-8 w-8 text-yellow-500" />;
      case 'cloudy':
      case 'partly-cloudy':
        return <CloudIcon className="h-8 w-8 text-gray-500" />;
      case 'rainy':
        return <CloudRainIcon className="h-8 w-8 text-blue-500" />;
      default:
        return <CloudIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const getSmallWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <SunIcon className="h-5 w-5 text-yellow-500" />;
      case 'cloudy':
      case 'partly-cloudy':
        return <CloudIcon className="h-5 w-5 text-gray-500" />;
      case 'rainy':
        return <CloudRainIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <CloudIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUVLevel = (uvIndex: number) => {
    if (uvIndex <= 2) return { level: 'Low', color: 'text-green-600' };
    if (uvIndex <= 5) return { level: 'Moderate', color: 'text-yellow-600' };
    if (uvIndex <= 7) return { level: 'High', color: 'text-orange-600' };
    if (uvIndex <= 10) return { level: 'Very High', color: 'text-red-600' };
    return { level: 'Extreme', color: 'text-purple-600' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-8 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weatherData) return null;

  const uvInfo = getUVLevel(weatherData.uvIndex);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-sm border border-blue-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Weather Conditions</h3>
          <span className="text-sm text-gray-600">{weatherData.location}</span>
        </div>

        {/* Current Weather */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {getWeatherIcon(weatherData.condition)}
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {weatherData.temperature}°C
              </p>
              <p className="text-sm text-gray-600 capitalize">
                {weatherData.condition.replace('-', ' ')}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">UV Index</p>
            <p className={`text-lg font-semibold ${uvInfo.color}`}>
              {weatherData.uvIndex} - {uvInfo.level}
            </p>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <DropIcon className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-600">Humidity</p>
              <p className="text-sm font-medium">{weatherData.humidity}%</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <WindIcon className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-600">Wind</p>
              <p className="text-sm font-medium">{weatherData.windSpeed} km/h</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-xs text-gray-600">Visibility</p>
              <p className="text-sm font-medium">{weatherData.visibility} km</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded-full bg-gray-400 flex items-center justify-center">
              <span className="text-xs text-white font-bold">P</span>
            </div>
            <div>
              <p className="text-xs text-gray-600">Pressure</p>
              <p className="text-sm font-medium">{weatherData.pressure} hPa</p>
            </div>
          </div>
        </div>

        {/* 4-Day Forecast */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">4-Day Forecast</h4>
          <div className="grid grid-cols-4 gap-3">
            {weatherData.forecast.map((day, index) => (
              <div key={index} className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  {day.day}
                </p>
                <div className="flex justify-center mb-2">
                  {getSmallWeatherIcon(day.condition)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {day.high}°
                  </p>
                  <p className="text-xs text-gray-600">
                    {day.low}°
                  </p>
                  {day.precipitation > 0 && (
                    <p className="text-xs text-blue-600">
                      {day.precipitation}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weather Alert */}
        {weatherData.forecast.some(day => day.precipitation > 70) && (
          <div className="mt-4 bg-blue-100 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <CloudRainIcon className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                Heavy rain expected this week. Consider adjusting irrigation schedules.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherWidget;