import React from 'react';
import { 
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Transaction {
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
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const classes = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'income' ? '+' : '-';
    const color = type === 'income' ? 'text-green-600' : 'text-red-600';
    return (
      <span className={`font-medium ${color}`}>
        {prefix}${Math.abs(amount).toLocaleString()}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          <button className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700">
            View all
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {transactions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">No recent transactions</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(transaction.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {transaction.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatDate(transaction.date || transaction.createdAt || '')}
                      </p>
                      {transaction.category && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {transaction.category.replace('_', ' ')}
                          </span>
                        </>
                      )}
                      {transaction.farmName && (
                        <>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {transaction.farmName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {formatAmount(transaction.amount, transaction.type)}
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {transactions.length > 0 && (
        <div className="bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Showing {transactions.length} of recent transactions
            </span>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              View financial reports →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentTransactions;