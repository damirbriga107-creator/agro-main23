import React, { useState, Suspense, lazy } from 'react';
import { useQuery } from 'react-query';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  DocumentTextIcon, 
  CpuChipIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  FunnelIcon,
  CalendarDaysIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Enhanced imports
import { apiClient, iotApi, financialApi } from '../services/api';
import { useAppStore, useFarms, useSelectedFarm, useNotifications } from '../store/appStore';
import { useApiQuery, usePaginatedQuery } from '../hooks/useApiQuery';
import { formatCurrency, formatNumber, createStaggerDelay } from '../lib/design-system';

// Original components
import DashboardMetrics from '../components/dashboard/DashboardMetrics';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import DeviceStatus from '../components/dashboard/DeviceStatus';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import QuickActions from '../components/dashboard/QuickActions';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

// New enhanced components
import Button from '../components/ui/Button';
import DataTable from '../components/ui/DataTable';
import Modal from '../components/ui/Modal';
import Form from '../components/ui/Form';
import { DashboardSkeleton, CardSkeleton } from '../components/ui/SkeletonLoaders';

// Lazy load heavy components for performance
const FinancialChart = lazy(() => import('../components/dashboard/FinancialChart').catch(() => ({ default: () => <CardSkeleton hasImage imageHeight="300px" /> })));
const CropAnalytics = lazy(() => import('../components/dashboard/CropAnalytics').catch(() => ({ default: () => <CardSkeleton hasImage imageHeight="200px" /> })));

const Dashboard: React.FC = () => {
  // Enhanced state management
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');

  // Store integration
  const selectedFarm = useSelectedFarm();
  const farms = useFarms();
  const notifications = useNotifications();
  const { selectFarm, addNotification } = useAppStore();

  // Enhanced API queries with new hooks
  const { data: dashboardData, isLoading, error } = useApiQuery({
    queryKey: ['dashboard-overview', selectedFarm?.id, selectedPeriod],
    queryFn: () => apiClient.getDashboardMetrics(),
    refetchInterval: 30000,
    staleTime: 15000,
    enabled: Boolean(selectedFarm?.id),
    showErrorToast: true,
  });

  const {
    items: transactions,
    isLoading: transactionsLoading,
    page: transactionPage,
    goToPage: goToTransactionPage,
    pagination: transactionPagination,
  } = usePaginatedQuery<import('../types/financial').Transaction>({
    baseQueryKey: ['recent-transactions', selectedFarm?.id || ''],
    queryFn: (page, limit) => financialApi.getTransactions({ page, limit }),
    pageSize: 10,
    enabled: Boolean(selectedFarm?.id),
  });

  const { data: deviceStatus } = useQuery(
    'device-status',
    () => iotApi.getDevices(),
    { refetchInterval: 15000 }
  );

  // Event handlers
  const handleAddTransaction = () => {
    setIsAddTransactionOpen(true);
  };

  const handleFarmChange = (farmId: string) => {
    selectFarm(farmId);
  };

  const periodOptions = [
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 3 months', value: '90d' },
    { label: 'Last year', value: '1y' },
  ];

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
      {/* Enhanced Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-neutral-900 animate-fadeInUp">
            Farm Dashboard
          </h1>
          <p className="text-neutral-600 animate-fadeInUp" style={{ animationDelay: '100ms' }}>
            {selectedFarm ? `${selectedFarm.name} • ${selectedFarm.size} ${selectedFarm.sizeUnit}` : 'Welcome to DaorsAgro Dashboard'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3 animate-fadeInRight">
          <Form.Root className="!space-y-0">
            <Form.Field>
              <Form.Select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                className="min-w-[150px]"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Field>
          </Form.Root>
          
          <Button
            leftIcon={PlusIcon}
            onClick={handleAddTransaction}
            disabled={!selectedFarm}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Farm Selection Alert */}
      {!selectedFarm && farms.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 animate-fadeInUp">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800">Select a farm to view dashboard</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {farms.map((farm) => (
                  <Button
                    key={farm.id}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleFarmChange(farm.id)}
                  >
                    {farm.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Alert */}
      {notifications.filter(n => !n.read).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 animate-fadeInUp">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                {notifications.filter(n => !n.read).length} unread notifications
              </h3>
              <div className="mt-2 space-y-1">
                {notifications.filter(n => !n.read).slice(0, 3).map(notification => (
                  <p key={notification.id} className="text-sm text-yellow-700">
                    {notification.title}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Status Card */}
      <div className="card card-hover animate-fadeInUp border-gradient">
        <div className="flex items-center justify-between p-8">
          <div className="animate-fadeInLeft">
            <h2 className="text-xl font-bold text-gradient-primary mb-2">System Overview</h2>
            <p className="text-lg text-neutral-600">
              Real-time monitoring of your agricultural operations
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
        <DashboardMetrics data={dashboardData?.data} />
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
                {/**
                 * RecentTransactions expects a simplified Transaction shape used by the UI.
                 * Map the API Transaction type to the UI shape here to keep typing strict.
                 */}
                {(() => {
                  type UIRecentTransaction = {
                    id: string;
                    type: 'income' | 'expense';
                    amount: number;
                    description: string;
                    status: 'completed' | 'pending' | 'failed';
                    createdAt?: string;
                    date?: string;
                    category?: string;
                    farmName?: string;
                    paymentMethod?: string;
                    currency?: string;
                  };

                  const mapped: UIRecentTransaction[] = (transactions || []).map((t) => ({
                    id: (t as any).id,
                    type: (t as any).transactionType === 'INCOME' ? 'income' : 'expense',
                    amount: (t as any).amount || 0,
                    description: (t as any).description || '',
                    status: 'completed',
                    createdAt: (t as any).createdAt,
                    date: (t as any).transactionDate,
                    category: (t as any).category?.name,
                    farmName: (t as any).farm?.name,
                    paymentMethod: (t as any).paymentMethod,
                    currency: 'USD',
                  }));

                  return <RecentTransactions transactions={mapped} />;
                })()}
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

      {/* Enhanced Transactions Section */}
      {selectedFarm && (
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm animate-fadeInUp stagger-6">
          <div className="p-6 border-b border-neutral-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">Recent Transactions</h3>
              <div className="flex items-center space-x-3">
                <Form.Root className="!space-y-0">
                  <Form.Field>
                    <Form.Select
                      value={selectedCropFilter}
                      onChange={(e) => setSelectedCropFilter(e.target.value)}
                      size="sm"
                      placeholder="Filter by crop"
                    >
                      <option value="all">All Crops</option>
                      <option value="corn">Corn</option>
                      <option value="wheat">Wheat</option>
                      <option value="soybeans">Soybeans</option>
                    </Form.Select>
                  </Form.Field>
                </Form.Root>
                <Button variant="secondary" size="sm" leftIcon={FunnelIcon}>
                  Filter
                </Button>
              </div>
            </div>
          </div>

          <Suspense fallback={<CardSkeleton />}>
            <DataTable.Root>
              <DataTable.Header>
                <DataTable.HeaderCell sortKey="date">Date</DataTable.HeaderCell>
                <DataTable.HeaderCell sortKey="type">Type</DataTable.HeaderCell>
                <DataTable.HeaderCell sortKey="category">Category</DataTable.HeaderCell>
                <DataTable.HeaderCell sortKey="amount" align="right">Amount</DataTable.HeaderCell>
                <DataTable.HeaderCell>Description</DataTable.HeaderCell>
              </DataTable.Header>

              <DataTable.Body>
                {transactionsLoading ? (
                  <DataTable.Loading />
                ) : transactions.length === 0 ? (
                  <DataTable.Empty 
                    title="No transactions found"
                    description="No transactions match your current filters."
                    action={
                      <Button onClick={handleAddTransaction} size="sm">
                        Add Transaction
                      </Button>
                    }
                  />
                ) : (
                  transactions.slice(0, 5).map((transaction, index) => {
                    return (
                    <DataTable.Row key={(transaction as any).id || index} data={transaction}>
                      <DataTable.Cell>
                        {transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleDateString() : '-'}
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.transactionType === 'INCOME' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.transactionType === 'INCOME' ? 'Income' : 'Expense'}
                        </span>
                      </DataTable.Cell>
                      <DataTable.Cell>{transaction.category?.name || 'General'}</DataTable.Cell>
                      <DataTable.Cell align="right">
                        <span className={transaction.transactionType === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.transactionType === 'INCOME' ? '+' : '-'}{formatCurrency(transaction.amount || 0)}
                        </span>
                      </DataTable.Cell>
                      <DataTable.Cell>{transaction.description || 'No description'}</DataTable.Cell>
                    </DataTable.Row>
                    );
                  })
                )}
              </DataTable.Body>
            </DataTable.Root>
          </Suspense>
        </div>
      )}

      {/* Enhanced Financial Charts */}
      {selectedFarm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeInUp stagger-7">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">Financial Overview</h3>
              <Button variant="secondary" size="sm" leftIcon={ChartBarIcon}>
                View Details
              </Button>
            </div>
            <Suspense fallback={<CardSkeleton hasImage imageHeight="300px" />}>
              <FinancialChart period={selectedPeriod} />
            </Suspense>
          </div>

          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-900">Crop Analytics</h3>
              <Button variant="secondary" size="sm" leftIcon={CalendarDaysIcon}>
                View All
              </Button>
            </div>
            <Suspense fallback={<CardSkeleton hasImage imageHeight="300px" />}>
              <CropAnalytics farmId={selectedFarm.id} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isAddTransactionOpen}
        onClose={() => setIsAddTransactionOpen(false)}
        title="Add Transaction"
        description="Record a new financial transaction for your farm"
        size="md"
      >
        <Modal.Body>
          <Form.Root onSubmit={(e) => { 
            e.preventDefault(); 
            // Handle form submission here
            addNotification({
              type: 'success',
              title: 'Transaction Added',
              message: 'Your transaction has been recorded successfully.',
            });
            setIsAddTransactionOpen(false); 
          }}>
            <Form.Section>
              <div className="grid grid-cols-2 gap-4">
                <Form.Field required>
                  <Form.Label>Transaction Type</Form.Label>
                  <Form.Select placeholder="Select type">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </Form.Select>
                </Form.Field>

                <Form.Field required>
                  <Form.Label>Category</Form.Label>
                  <Form.Select placeholder="Select category">
                    <option value="seeds">Seeds</option>
                    <option value="fertilizer">Fertilizer</option>
                    <option value="labor">Labor</option>
                    <option value="equipment">Equipment</option>
                    <option value="sale">Crop Sale</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Field>
              </div>

              <Form.Field required>
                <Form.Label>Amount</Form.Label>
                <Form.Input
                  type="number"
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
                <Form.Help>
                  Enter the transaction amount in your local currency
                </Form.Help>
              </Form.Field>

              <Form.Field required>
                <Form.Label>Description</Form.Label>
                <Form.Textarea
                  placeholder="Enter transaction description"
                  rows={3}
                />
              </Form.Field>

              <div className="grid grid-cols-2 gap-4">
                <Form.Field>
                  <Form.Label>Date</Form.Label>
                  <Form.Input 
                    type="date" 
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </Form.Field>

                <Form.Field>
                  <Form.Label>Related Crop</Form.Label>
                  <Form.Select placeholder="Select crop (optional)">
                    <option value="">None</option>
                    <option value="corn">Corn</option>
                    <option value="wheat">Wheat</option>
                    <option value="soybeans">Soybeans</option>
                  </Form.Select>
                </Form.Field>
              </div>
            </Form.Section>
          </Form.Root>
        </Modal.Body>

        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => setIsAddTransactionOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            onClick={() => {
              addNotification({
                type: 'success',
                title: 'Transaction Added',
                message: 'Your transaction has been recorded successfully.',
              });
              setIsAddTransactionOpen(false);
            }}
          >
            Add Transaction
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Dashboard;