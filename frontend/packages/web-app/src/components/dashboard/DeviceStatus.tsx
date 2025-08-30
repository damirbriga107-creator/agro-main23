import React from 'react';
import { 
  CpuChipIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Device {
  id: string;
  name: string;
  type: 'soil_sensor' | 'weather_station' | 'irrigation_controller' | 'camera' | 'moisture_sensor' | 'temperature_sensor';
  status: 'online' | 'offline' | 'warning' | 'maintenance' | 'error';
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  location?: {
    farmId: string;
    farmName: string;
    field?: string;
  };
  sensorReadings?: {
    temperature?: number;
    humidity?: number;
    soilMoisture?: number;
    ph?: number;
  };
  firmware?: string;
}

interface DeviceStatusProps {
  devices: Device[];
}

const DeviceStatus: React.FC<DeviceStatusProps> = ({ devices }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'offline':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      online: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      offline: 'bg-red-100 text-red-800',
      maintenance: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSignalBars = (strength?: number) => {
    if (!strength) return null;
    
    const bars = Math.ceil((strength / 100) * 4);
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-1 ${
              bar <= bars ? 'bg-green-500' : 'bg-gray-300'
            } ${bar === 1 ? 'h-2' : bar === 2 ? 'h-3' : bar === 3 ? 'h-4' : 'h-5'}`}
          />
        ))}
      </div>
    );
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return 'bg-gray-300';
    if (level > 50) return 'bg-green-500';
    if (level > 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const deviceStats = {
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    warning: devices.filter(d => d.status === 'warning').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Device Status</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">{deviceStats.online} Online</span>
            </div>
            {deviceStats.warning > 0 && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-600">{deviceStats.warning} Warning</span>
              </div>
            )}
            {deviceStats.offline > 0 && (
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-600">{deviceStats.offline} Offline</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {devices.length === 0 ? (
          <div className="p-6 text-center">
            <CpuChipIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">No devices connected</p>
          </div>
        ) : (
          devices.slice(0, 5).map((device) => (
            <div key={device.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(device.status)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {device.name}
                      </p>
                      <span className="text-xs text-gray-500 capitalize">
                        {device.type}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500">
                        Last seen: {formatLastSeen(device.lastSeen)}
                      </p>
                      {device.location?.farmName && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {device.location.farmName}
                            {device.location.field && ` - ${device.location.field}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  {/* Sensor Data */}
                  {device.sensorReadings && (
                    <div className="hidden md:flex items-center space-x-3 text-xs text-gray-500">
                      {device.sensorReadings.temperature && (
                        <span>{device.sensorReadings.temperature.toFixed(1)}°C</span>
                      )}
                      {device.sensorReadings.humidity && (
                        <span>{device.sensorReadings.humidity}% RH</span>
                      )}
                      {device.sensorReadings.soilMoisture && (
                        <span>Soil: {device.sensorReadings.soilMoisture}%</span>
                      )}
                      {device.sensorReadings.ph && (
                        <span>pH: {device.sensorReadings.ph.toFixed(1)}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Signal Strength */}
                  {device.signalStrength && (
                    <div className="flex items-center space-x-1">
                      <SignalIcon className="h-4 w-4 text-gray-400" />
                      {getSignalBars(device.signalStrength)}
                    </div>
                  )}
                  
                  {/* Battery Level */}
                  {device.batteryLevel && (
                    <div className="flex items-center space-x-1">
                      <div className="w-6 h-3 border border-gray-300 rounded-sm">
                        <div 
                          className={`h-full rounded-sm ${getBatteryColor(device.batteryLevel)}`}
                          style={{ width: `${device.batteryLevel}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{device.batteryLevel}%</span>
                    </div>
                  )}
                  
                  {getStatusBadge(device.status)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {devices.length > 5 && (
        <div className="bg-gray-50 px-6 py-3">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all {devices.length} devices →
          </button>
        </div>
      )}
    </div>
  );
};

export default DeviceStatus;