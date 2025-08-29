import React from 'react';
import { useQuery } from 'react-query';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  dismissed?: boolean;
  actionRequired?: boolean;
  category?: string;
}

const AlertsPanel: React.FC = () => {
  // Mock alerts data - in real app, this would fetch from API
  const { data: alerts = [], isLoading } = useQuery<Alert[]>(
    'system-alerts',
    async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          type: 'warning',
          title: 'Low Soil Moisture',
          message: 'Field A sensors report moisture below optimal levels. Consider irrigation.',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          actionRequired: true,
          category: 'irrigation'
        },
        {
          id: '2',
          type: 'info',
          title: 'Weather Update',
          message: 'Rain expected in 48 hours. Postpone planned fertilizer application.',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          category: 'weather'
        },
        {
          id: '3',
          type: 'error',
          title: 'Device Offline',
          message: 'Sensor Node #7 has been offline for 6 hours. Check power and connectivity.',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          actionRequired: true,
          category: 'device'
        },
        {
          id: '4',
          type: 'success',
          title: 'Subsidy Approved',
          message: 'Your irrigation subsidy application has been approved. Funds will be disbursed within 5 business days.',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          category: 'subsidy'
        },
        {
          id: '5',
          type: 'warning',
          title: 'Pest Alert',
          message: 'Increased aphid activity detected in neighboring farms. Monitor crops closely.',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          category: 'pest'
        }
      ];
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
    }
  );

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColors = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800'
        };
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    
    const categoryColors = {
      irrigation: 'bg-blue-100 text-blue-800',
      weather: 'bg-indigo-100 text-indigo-800',
      device: 'bg-gray-100 text-gray-800',
      subsidy: 'bg-green-100 text-green-800',
      pest: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  const priorityAlerts = alerts.filter(alert => alert.actionRequired);
  const recentAlerts = alerts.slice(0, 5);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start space-x-3">
                <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">System Alerts</h3>
          <div className="flex items-center space-x-2">
            {priorityAlerts.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {priorityAlerts.length} Priority
              </span>
            )}
            <span className="text-sm text-gray-500">
              {alerts.length} total
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {recentAlerts.length === 0 ? (
          <div className="p-6 text-center">
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
            <p className="mt-2 text-gray-500">No active alerts</p>
            <p className="text-sm text-gray-400">All systems operating normally</p>
          </div>
        ) : (
          recentAlerts.map((alert) => {
            const colors = getAlertColors(alert.type);
            return (
              <div
                key={alert.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${colors.bg} border-l-4 ${colors.border}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className={`text-sm font-medium ${colors.text}`}>
                          {alert.title}
                        </p>
                        {alert.actionRequired && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${colors.text.replace('800', '700')}`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(alert.timestamp)}
                        </span>
                        {getCategoryBadge(alert.category)}
                      </div>
                    </div>
                  </div>
                  <button className="ml-2 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {alerts.length > 5 && (
        <div className="bg-gray-50 px-6 py-3">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all {alerts.length} alerts →
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;