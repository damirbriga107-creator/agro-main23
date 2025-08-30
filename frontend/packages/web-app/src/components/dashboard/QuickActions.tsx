import React from 'react';
import {
  PlusIcon,
  DocumentPlusIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  UserPlusIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

interface QuickAction {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  href?: string;
  onClick?: () => void;
}

const QuickActions: React.FC = () => {
  const actions: QuickAction[] = [
    {
      name: 'Add Transaction',
      description: 'Record new income or expense',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      onClick: () => console.log('Add transaction clicked')
    },
    {
      name: 'Create Report',
      description: 'Generate financial report',
      icon: ChartBarIcon,
      color: 'bg-blue-500',
      onClick: () => console.log('Create report clicked')
    },
    {
      name: 'Add Document',
      description: 'Upload invoice or receipt',
      icon: CloudArrowUpIcon,
      color: 'bg-purple-500',
      onClick: () => console.log('Add document clicked')
    },
    {
      name: 'Apply for Subsidy',
      description: 'Submit subsidy application',
      icon: DocumentPlusIcon,
      color: 'bg-indigo-500',
      onClick: () => console.log('Apply subsidy clicked')
    },
    {
      name: 'Invite User',
      description: 'Add team member',
      icon: UserPlusIcon,
      color: 'bg-orange-500',
      onClick: () => console.log('Invite user clicked')
    },
    {
      name: 'Settings',
      description: 'Configure preferences',
      icon: CogIcon,
      color: 'bg-gray-500',
      onClick: () => console.log('Settings clicked')
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        <PlusIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="flex items-center p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left group"
          >
            <div className={`${action.color} rounded-lg p-2 mr-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                {action.name}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;