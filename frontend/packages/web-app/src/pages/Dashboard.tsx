import React from 'react';
import { useQuery } from 'react-query';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  CpuChipIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { apiClient } from '../services/api';
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DeviceStatus from '../components/dashboard/DeviceStatus';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import QuickActions from '../components/dashboard/QuickActions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const Dashboard: React.FC = () => {
  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard-overview',
    () => apiClient.getDashboardMetrics(),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 15000, // Consider data stale after 15 seconds
    }
  );

  const { data: recentTransactions } = useQuery(
    'recent-transactions',
    () => apiClient.getFinancialTransactions({ limit: 5 }),
    { staleTime: 60000 }
  );

  const { data: deviceStatus } = useQuery(
    'device-status',
    () => apiClient.getIoTDevices({ limit: 10 }),
    { refetchInterval: 15000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage 
        title="Failed to load dashboard"
        message="Unable to fetch dashboard data. Please try again."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Welcome back! Here's an overview of your agricultural operations.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              System Status: Online
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <DashboardMetrics data={dashboardData} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weather Widget */}
          <WeatherWidget />
          
          {/* Recent Transactions */}
          <RecentTransactions transactions={recentTransactions?.data || []} />
          
          {/* Device Status */}
          <DeviceStatus devices={deviceStatus?.data || []} />
        </div>

        {/* Right Column - Quick Actions and Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <QuickActions />
          
          {/* Alerts Panel */}
          <AlertsPanel />
          
          {/* System Health */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CpuChipIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-700">API Gateway</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Healthy
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">Security</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Secure
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-700">Database</span>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;