import React from 'react';
import { 
  CalendarIcon, 
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

import { Budget, BudgetCategoryAnalysis } from '../../types/financial';

interface BudgetProgressCardProps {
  budget: Budget;
  analysis?: {
    totalSpent: number;
    remainingBudget: number;
    usagePercentage: number;
    categories: BudgetCategoryAnalysis[];
  };
  onViewDetails?: (budget: Budget) => void;
  onEdit?: (budget: Budget) => void;
}

const BudgetProgressCard: React.FC<BudgetProgressCardProps> = ({ 
  budget, 
  analysis, 
  onViewDetails,
  onEdit 
}) => {
  const spent = analysis?.totalSpent || 0;
  const remaining = analysis?.remainingBudget || budget.totalBudget;
  const progress = analysis?.usagePercentage || (spent / budget.totalBudget) * 100;
  const isOverBudget = progress > 100;
  const isNearLimit = progress > 80;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = () => {
    if (isOverBudget) return 'text-red-600 bg-red-100';
    if (isNearLimit) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = () => {
    if (isOverBudget) return ExclamationTriangleIcon;
    if (isNearLimit) return ExclamationTriangleIcon;
    return CheckCircleIcon;
  };

  const StatusIcon = getStatusIcon();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {budget.name}
          </h3>
          {budget.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {budget.description}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            budget.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
            budget.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' :
            budget.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {budget.status}
          </span>
          <div className={`p-1 rounded-full ${getStatusColor()}`}>
            <StatusIcon className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Budget Period */}
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <CalendarIcon className="h-4 w-4 mr-2" />
        <span>
          {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Budget Progress
          </span>
          <span className={`text-sm font-bold ${
            isOverBudget ? 'text-red-600' : 
            isNearLimit ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {progress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-300 ${
              isOverBudget ? 'bg-red-500' : 
              isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
          {isOverBudget && (
            <div 
              className="h-3 bg-red-600 rounded-full -mt-3 opacity-50"
              style={{ width: `${Math.min(progress - 100, 20)}%`, marginLeft: '100%' }}
            />
          )}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <CurrencyDollarIcon className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-xs font-medium text-gray-600">Budget</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(budget.totalBudget)}
          </p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <span className="text-xs font-medium text-gray-600">Spent</span>
          </div>
          <p className={`text-sm font-semibold ${
            isOverBudget ? 'text-red-600' : 'text-gray-900'
          }`}>
            {formatCurrency(spent)}
          </p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <span className="text-xs font-medium text-gray-600">
              {remaining >= 0 ? 'Remaining' : 'Over Budget'}
            </span>
          </div>
          <p className={`text-sm font-semibold ${
            remaining >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(Math.abs(remaining))}
          </p>
        </div>
      </div>

      {/* Category Breakdown (if analysis available) */}
      {analysis && analysis.categories.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
            Category Breakdown
          </h4>
          <div className="space-y-2">
            {analysis.categories.slice(0, 3).map((catAnalysis, index) => {
              const categoryProgress = catAnalysis.usagePercentage;
              const isOverCategory = categoryProgress > 100;
              
              return (
                <div key={index} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-700 truncate">
                      {catAnalysis.category?.name || 'Unknown Category'}
                    </span>
                    <span className={`font-medium ${
                      isOverCategory ? 'text-red-600' : 
                      categoryProgress > 80 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {categoryProgress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        isOverCategory ? 'bg-red-400' : 
                        categoryProgress > 80 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${Math.min(categoryProgress, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {analysis.categories.length > 3 && (
              <p className="text-xs text-gray-500 text-center pt-1">
                +{analysis.categories.length - 3} more categories
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          {isOverBudget && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Over Budget
            </span>
          )}
          {isNearLimit && !isOverBudget && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Near Limit
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(budget)}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              View Details
            </button>
          )}
          {onEdit && budget.status !== 'COMPLETED' && (
            <button
              onClick={() => onEdit(budget)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BudgetProgressCard;