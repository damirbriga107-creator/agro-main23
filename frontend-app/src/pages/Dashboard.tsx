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
    <div className="space-y-8">
      {/* Page Header with enhanced animations */}
      <div className="card card-hover animate-fadeInUp border-gradient">
        <div className="flex items-center justify-between p-8">
          <div className="animate-fadeInLeft">
            <h1 className="text-3xl font-bold text-gradient-primary mb-2">Dashboard</h1>
            <p className="text-lg text-neutral-600">
              Welcome back! Here's an overview of your agricultural operations.
            </p>
          </div>
          <div className="flex items-center space-x-4 animate-fadeInRight">
            <div className="flex items-center text-sm text-neutral-500 card px-4 py-2">
              <div className="w-3 h-3 bg-primary-500 rounded-full mr-3 animate-pulse-slow"></div>
              <span className="font-medium">System Status: Online</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gradient-earth">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-neutral-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with staggered animations */}
      <div className="animate-fadeInUp stagger-2">
        <DashboardMetrics data={dashboardData} />
      </div>

      {/* Main Content Grid with enhanced layout */}
      <div className="grid-dashboard gap-8">
        {/* Left Column - Charts and Analytics */}
        <div className="space-y-8">
          {/* Weather Widget */}
          <div className="animate-fadeInUp stagger-3">
            <WeatherWidget />
          </div>
          
          {/* Recent Transactions */}
          <div className="animate-fadeInUp stagger-4">
            <RecentTransactions transactions={recentTransactions?.data || []} />
          </div>
          
          {/* Device Status */}
          <div className="animate-fadeInUp stagger-5">
            <DeviceStatus devices={deviceStatus?.data || []} />
          </div>
        </div>

        {/* Right Column - Quick Actions and Alerts */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <div className="animate-fadeInRight stagger-3">
            <QuickActions />
          </div>
          
          {/* Alerts Panel */}
          <div className="animate-fadeInRight stagger-4">
            <AlertsPanel />
          </div>
          
          {/* System Health with enhanced design */}
          <div className="card card-hover animate-fadeInRight stagger-5">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-6 flex items-center">
                <div className="w-2 h-6 bg-gradient-primary rounded-full mr-3"></div>
                System Health
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary-50 to-sky-50 border border-primary-100 hover-lift">
                  <div className="flex items-center">
                    <CpuChipIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-sm font-medium text-neutral-700">API Gateway</span>
                  </div>
                  <span className="status-online animate-scaleIn">Healthy</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary-50 to-earth-50 border border-primary-100 hover-lift">
                  <div className="flex items-center">
                    <ShieldCheckIcon className="h-5 w-5 text-primary-600 mr-3" />
                    <span className="text-sm font-medium text-neutral-700">Security</span>
                  </div>
                  <span className="status-online animate-scaleIn">Secure</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-sky-50 to-sunset-50 border border-sky-100 hover-lift">
                  <div className="flex items-center">
                    <DocumentTextIcon className="h-5 w-5 text-sky-600 mr-3" />
                    <span className="text-sm font-medium text-neutral-700">Database</span>
                  </div>
                  <span className="status-online animate-scaleIn">Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;