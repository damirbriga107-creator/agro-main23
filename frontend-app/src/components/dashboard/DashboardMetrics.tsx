import React from 'react';
import { 
  CurrencyDollarIcon, 
  TruckIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  BuildingOfficeIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import MetricCard from '../ui/MetricCard';
import { LoadingSkeleton } from '../ui/LoadingComponents';

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
  // Handle loading state with beautiful skeletons
  if (!data || !data.metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, index) => (
          <LoadingSkeleton key={index} type="card" className={`animate-fadeInUp stagger-${index + 1}`} />
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
  const productionGrowth = 12.5;
  const farmGrowth = 5.3;

  const metrics = [
    {
      title: 'Total Revenue',
      value: financial?.total_revenue || 0,
      subtitle: data.period || 'This month',
      icon: CurrencyDollarIcon,
      color: 'primary' as const,
      trend: {
        value: revenueGrowth,
        direction: 'up' as const,
        label: 'vs last month'
      }
    },
    {
      title: 'Net Profit',
      value: netProfit,
      subtitle: `${profitMargin.toFixed(1)}% profit margin`,
      icon: ChartBarIcon,
      color: netProfit >= 0 ? 'earth' as const : 'sunset' as const,
      trend: {
        value: Math.abs(profitMargin),
        direction: netProfit >= 0 ? 'up' as const : 'down' as const,
        label: 'profit margin'
      }
    },
    {
      title: 'Active Farms',
      value: financial?.active_farms || 0,
      subtitle: `${production?.producing_farms || 0} producing farms`,
      icon: BuildingOfficeIcon,
      color: 'sky' as const,
      trend: {
        value: farmGrowth,
        direction: 'up' as const,
        label: 'growth this month'
      }
    },
    {
      title: 'Production',
      value: `${(production?.total_production || 0).toLocaleString()}`,
      subtitle: `${production?.crop_varieties || 0} crop varieties`,
      icon: CubeIcon,
      color: 'earth' as const,
      trend: {
        value: productionGrowth,
        direction: 'up' as const,
        label: 'tons produced'
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          subtitle={metric.subtitle}
          icon={metric.icon}
          color={metric.color}
          trend={metric.trend}
          animationDelay={index * 100}
          className="hover-lift"
        />
      ))}
    </div>
  );
};
export default DashboardMetrics;