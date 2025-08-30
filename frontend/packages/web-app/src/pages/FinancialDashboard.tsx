import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { 
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ScaleIcon,
  PlusIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../services/api';
import { FinancialMetrics, Transaction, Budget } from '../types/financial';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import TransactionForm from '../components/financial/TransactionForm';
import FinancialNotifications from '../components/financial/FinancialNotifications';
import { useFinancialWebSocket } from '../hooks/useFinancialWebSocket';

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'blue' | 'yellow';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon: Icon, 
  color 
}) => {
  const colorClasses = {
    green: {
      icon: 'text-green-600 bg-green-100',
      trend: change && change > 0 ? 'text-green-600' : 'text-red-600',
      border: 'border-green-200'
    },
    red: {
      icon: 'text-red-600 bg-red-100',
      trend: change && change > 0 ? 'text-green-600' : 'text-red-600',
      border: 'border-red-200'
    },
    blue: {
      icon: 'text-blue-600 bg-blue-100',
      trend: change && change > 0 ? 'text-green-600' : 'text-red-600',
      border: 'border-blue-200'
    },
    yellow: {
      icon: 'text-yellow-600 bg-yellow-100',
      trend: change && change > 0 ? 'text-green-600' : 'text-red-600',
      border: 'border-yellow-200'
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${colorClasses[color].border} p-6`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change > 0 ? (
                <TrendingUpIcon className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <TrendingDownIcon className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={`text-sm font-medium ${colorClasses[color].trend}`}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500 ml-1">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color].icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

interface TransactionRowProps {
  transaction: Transaction;
}

const TransactionRow: React.FC<TransactionRowProps> = ({ transaction }) => {
  const isIncome = transaction.transactionType === 'INCOME';
  
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex-1">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
            isIncome ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {isIncome ? (
              <TrendingUpIcon className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDownIcon className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {transaction.description}
            </p>
            <p className="text-xs text-gray-500">
              {transaction.category?.name} • {new Date(transaction.transactionDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${
          isIncome ? 'text-green-600' : 'text-red-600'
        }`}>
          {isIncome ? '+' : '-'}${transaction.amount.toLocaleString()}
        </p>
        {transaction.paymentMethod && (
          <p className="text-xs text-gray-500 capitalize">
            {transaction.paymentMethod.toLowerCase().replace('_', ' ')}
          </p>
        )}
      </div>
    </div>
  );
};

interface BudgetCardProps {
  budget: Budget;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget }) => {
  const progress = 65; // This would come from backend calculation
  const isOverBudget = progress > 100;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 truncate">
          {budget.name}
        </h4>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          budget.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
          budget.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {budget.status}
        </span>
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              isOverBudget ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Budget: ${budget.totalBudget.toLocaleString()}</span>
        <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
          Used: ${Math.round(budget.totalBudget * progress / 100).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

const FinancialDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionFormType, setTransactionFormType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const { isConnected, lastEvent } = useFinancialWebSocket({
    farmId: user?.farmIds?.[0],
    subscriptions: ['transactions', 'budgets', 'reports'],
    autoConnect: true
  });

  // Invalidate queries when real-time events are received
  React.useEffect(() => {
    if (lastEvent) {
      const { type } = lastEvent;
      
      if (type.includes('transaction')) {
        queryClient.invalidateQueries(['financial-metrics']);
        queryClient.invalidateQueries(['recent-transactions']);
      }
      
      if (type.includes('budget')) {
        queryClient.invalidateQueries(['active-budgets']);
        queryClient.invalidateQueries(['financial-metrics']);
      }
      
      if (type.includes('summary')) {
        queryClient.invalidateQueries(['financial-metrics']);
      }
    }
  }, [lastEvent, queryClient]);
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const { isConnected, lastEvent } = useFinancialWebSocket({
    farmId: user?.farmIds?.[0],
    subscriptions: ['transactions', 'budgets', 'reports'],
    autoConnect: true
  });

  // Fetch financial metrics
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery<FinancialMetrics>(
    ['financial-metrics', dateRange],
    () => apiClient.getFinancialMetrics({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }),
    {
      staleTime: 300000, // 5 minutes
      refetchInterval: 300000
    }
  );

  // Fetch recent transactions
  const { data: recentTransactions, isLoading: transactionsLoading } = useQuery(
    ['recent-transactions', 5],
    () => apiClient.getFinancialTransactions({ limit: 5, sortBy: 'transactionDate', sortOrder: 'desc' }),
    { staleTime: 60000 }
  );

  // Fetch active budgets
  const { data: activeBudgets, isLoading: budgetsLoading } = useQuery(
    ['active-budgets'],
    () => apiClient.getBudgets({ status: 'ACTIVE', limit: 4 }),
    { staleTime: 300000 }
  );

  const formattedMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      revenue: {
        value: `$${metrics.totalRevenue.toLocaleString()}`,
        change: 12.5, // This would come from backend comparison
        changeLabel: 'vs last period'
      },
      expenses: {
        value: `$${metrics.totalExpenses.toLocaleString()}`,
        change: -8.2,
        changeLabel: 'vs last period'
      },
      profit: {
        value: `$${metrics.netProfit.toLocaleString()}`,
        change: 15.3,
        changeLabel: 'vs last period'
      },
      margin: {
        value: `${metrics.profitMargin.toFixed(1)}%`,
        change: 2.1,
        changeLabel: 'margin'
      }
    };
  }, [metrics]);

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (metricsError) {
    return (
      <ErrorMessage 
        title="Failed to load financial data"
        message="Unable to fetch financial metrics. Please try again."
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
            <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="mt-1 text-gray-600">
              Track your farm's financial performance and manage budgets
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-sm border border-gray-300 rounded-md px-3 py-1"
              />
            </div>
            <FinancialNotifications farmId={user?.farmIds?.[0]} />
            <button 
              onClick={() => {
                setTransactionFormType('EXPENSE');
                setShowTransactionForm(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {formattedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={formattedMetrics.revenue.value}
            change={formattedMetrics.revenue.change}
            changeLabel={formattedMetrics.revenue.changeLabel}
            icon={TrendingUpIcon}
            color="green"
          />
          <MetricCard
            title="Total Expenses"
            value={formattedMetrics.expenses.value}
            change={formattedMetrics.expenses.change}
            changeLabel={formattedMetrics.expenses.changeLabel}
            icon={TrendingDownIcon}
            color="red"
          />
          <MetricCard
            title="Net Profit"
            value={formattedMetrics.profit.value}
            change={formattedMetrics.profit.change}
            changeLabel={formattedMetrics.profit.changeLabel}
            icon={CurrencyDollarIcon}
            color="blue"
          />
          <MetricCard
            title="Profit Margin"
            value={formattedMetrics.margin.value}
            change={formattedMetrics.margin.change}
            changeLabel={formattedMetrics.margin.changeLabel}
            icon={ScaleIcon}
            color="yellow"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts and Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Monthly Trend Chart Placeholder */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Monthly Trend</h3>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
                <div className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-400' : 'bg-red-400'
                }`} title={isConnected ? 'Real-time updates active' : 'Real-time updates unavailable'} />
              </div>
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Chart visualization will be implemented here</p>
                <p className="text-sm">Revenue vs Expenses over time</p>
                {isConnected && (
                  <p className="text-xs text-green-600 mt-2">📡 Real-time updates active</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
              <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                View All
              </button>
            </div>
            {transactionsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-0">
                {recentTransactions?.data?.slice(0, 5).map((transaction: Transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}
                {(!recentTransactions?.data || recentTransactions.data.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No recent transactions found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Budgets and Quick Actions */}
        <div className="space-y-6">
          {/* Active Budgets */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Active Budgets</h3>
              <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                Manage
              </button>
            </div>
            {budgetsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="space-y-4">
                {activeBudgets?.data?.map((budget: Budget) => (
                  <BudgetCard key={budget.id} budget={budget} />
                ))}
                {(!activeBudgets?.data || activeBudgets.data.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <ScaleIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No active budgets</p>
                    <button className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium">
                      Create Budget
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={() => {
                  setTransactionFormType('INCOME');
                  setShowTransactionForm(true);
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <PlusIcon className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add Income</p>
                    <p className="text-xs text-gray-500">Record a new income transaction</p>
                  </div>
                </div>
              </button>
              
              <button 
                onClick={() => {
                  setTransactionFormType('EXPENSE');
                  setShowTransactionForm(true);
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <TrendingDownIcon className="h-5 w-5 text-red-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Add Expense</p>
                    <p className="text-xs text-gray-500">Record a new expense transaction</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <ScaleIcon className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Create Budget</p>
                    <p className="text-xs text-gray-500">Set up a new budget plan</p>
                  </div>
                </div>
              </button>
              
              <button className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Generate Report</p>
                    <p className="text-xs text-gray-500">Create financial reports</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Form Modal */}
      <TransactionForm
        isOpen={showTransactionForm}
        onClose={() => setShowTransactionForm(false)}
        initialData={{
          transactionType: transactionFormType,
          farmId: user?.farmIds?.[0] || ''
        }}
        onSuccess={() => {
          // Queries will be invalidated by the TransactionForm component
        }}
      />
    </div>
  );
};

export default FinancialDashboard;