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
  period?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  metrics?: {
    financial?: {
      total_revenue: number;
      total_expenses: number;
      net_profit: number;
      active_farms: number;
      avg_revenue_per_transaction: number;
    };
    production?: {
      total_production: number;
      avg_production_per_farm: number;
      producing_farms: number;
      crop_varieties: number;
      avg_quality_score: number;
    };
    users?: {
      total_active_users: number;
      new_registrations: number;
      login_count: number;
      avg_session_duration: number;
    };
    subsidies?: {
      total_subsidies: number;
      total_applications: number;
      approved_applications: number;
      approval_rate: number;
      avg_processing_time: number;
    };
    insurance?: {
      total_premiums: number;
      total_claims: number;
      active_policies: number;
      total_claims_count: number;
      avg_claim_amount: number;
    };
  };
  trends?: any;
  alerts?: any[];
}

interface DashboardMetricsProps {
  data?: MetricData;
}

const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ data }) => {
  // Handle loading state
  if (!data || !data.metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const { financial, production, users, subsidies, insurance } = data.metrics;

  // Calculate derived metrics
  const netProfit = financial?.net_profit || 0;
  const profitMargin = financial?.total_revenue ? 
    ((netProfit / financial.total_revenue) * 100) : 0;
  const revenueGrowth = 15.2; // Mock growth percentage
  const monthlyGrowth = 8;

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${(financial?.total_revenue || 0).toLocaleString()}`,
      change: revenueGrowth,
      changeText: `+${revenueGrowth.toFixed(1)}%`,
      icon: CurrencyDollarIcon,
      color: 'blue',
      description: data.period || 'This month'
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
      title: 'Active Farms',
      value: (financial?.active_farms || 0).toString(),
      change: monthlyGrowth,
      changeText: `+${monthlyGrowth} this month`,
      icon: DocumentTextIcon,
      color: 'indigo',
      description: `${production?.producing_farms || 0} producing`
    },
    {
      title: 'Production',
      value: `${(production?.total_production || 0).toLocaleString()} tons`,
      change: production?.avg_quality_score || 0,
      changeText: `${(production?.avg_quality_score || 0).toFixed(1)}% quality`,
      icon: TruckIcon,
      color: 'green',
      description: `${production?.crop_varieties || 0} varieties`
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