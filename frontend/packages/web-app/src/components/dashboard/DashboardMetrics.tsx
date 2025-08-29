import React from 'react';
import { 
  CurrencyDollarIcon, 
  TruckIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface MetricData {
  totalRevenue?: number;
  totalExpenses?: number;
  activeSubsidies?: number;
  pendingApplications?: number;
  connectedDevices?: number;
  alertsCount?: number;
  monthlyGrowth?: number;
  revenueGrowth?: number;
}

interface DashboardMetricsProps {
  data?: MetricData;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ data = {} }) => {
  const {
    totalRevenue = 0,
    totalExpenses = 0,
    activeSubsidies = 0,
    pendingApplications = 0,
    connectedDevices = 0,
    alertsCount = 0,
    monthlyGrowth = 0,
    revenueGrowth = 0
  } = data;

  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: revenueGrowth,
      changeText: `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth.toFixed(1)}%`,
      icon: CurrencyDollarIcon,
      color: 'blue',
      description: 'This month'
    },
    {
      title: 'Net Profit',
      value: `$${netProfit.toLocaleString()}`,
      change: profitMargin,
      changeText: `${profitMargin.toFixed(1)}% margin`,
      icon: ChartBarIcon,
      color: netProfit >= 0 ? 'green' : 'red',
      description: 'Profit margin'
    },
    {
      title: 'Active Subsidies',
      value: activeSubsidies.toString(),
      change: monthlyGrowth,
      changeText: `${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth} this month`,
      icon: DocumentTextIcon,
      color: 'indigo',
      description: 'Government programs'
    },
    {
      title: 'Connected Devices',
      value: connectedDevices.toString(),
      change: 0,
      changeText: `${alertsCount} alerts`,
      icon: TruckIcon,
      color: alertsCount > 0 ? 'yellow' : 'green',
      description: 'IoT sensors'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        icon: 'text-blue-600',
        border: 'border-blue-200'
      },
      green: {
        bg: 'bg-green-50',
        icon: 'text-green-600',
        border: 'border-green-200'
      },
      red: {
        bg: 'bg-red-50',
        icon: 'text-red-600',
        border: 'border-red-200'
      },
      indigo: {
        bg: 'bg-indigo-50',
        icon: 'text-indigo-600',
        border: 'border-indigo-200'
      },
      yellow: {
        bg: 'bg-yellow-50',
        icon: 'text-yellow-600',
        border: 'border-yellow-200'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const colorClasses = getColorClasses(metric.color);
        const isPositiveChange = metric.change >= 0;
        
        return (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-sm border ${colorClasses.border} p-6 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center">
              <div className={`${colorClasses.bg} rounded-lg p-3`}>
                <metric.icon className={`h-6 w-6 ${colorClasses.icon}`} />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center">
                {metric.title === 'Connected Devices' ? (
                  <span className={`text-sm ${alertsCount > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {metric.changeText}
                  </span>
                ) : (
                  <>
                    {isPositiveChange ? (
                      <ArrowUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`ml-1 text-sm ${
                      isPositiveChange ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.changeText}
                    </span>
                  </>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {metric.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardMetrics;