import React from 'react';
import {
  PlusIcon,
  DocumentPlusIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BellIcon,
  UserPlusIcon,
  CloudArrowUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface QuickAction {
  name: string;
  description: string;
  icon: React.ElementType;
  color: 'primary' | 'earth' | 'sky' | 'sunset';
  href?: string;
  onClick?: () => void;
}

const QuickActions: React.FC = () => {
  const actions: QuickAction[] = [
    {
      name: 'Add Transaction',
      description: 'Record new income or expense',
      icon: CurrencyDollarIcon,
      color: 'primary',
      onClick: () => console.log('Add transaction clicked')
    },
    {
      name: 'Create Report',
      description: 'Generate financial report',
      icon: ChartBarIcon,
      color: 'sky',
      onClick: () => console.log('Create report clicked')
    },
    {
      name: 'Add Document',
      description: 'Upload invoice or receipt',
      icon: CloudArrowUpIcon,
      color: 'earth',
      onClick: () => console.log('Add document clicked')
    },
    {
      name: 'Apply for Subsidy',
      description: 'Submit subsidy application',
      icon: DocumentPlusIcon,
      color: 'sunset',
      onClick: () => console.log('Apply subsidy clicked')
    },
    {
      name: 'Invite User',
      description: 'Add team member',
      icon: UserPlusIcon,
      color: 'earth',
      onClick: () => console.log('Invite user clicked')
    },
    {
      name: 'Settings',
      description: 'Configure preferences',
      icon: Cog6ToothIcon,
      color: 'sky',
      onClick: () => console.log('Settings clicked')
    }
  ];

  const getColorClasses = (color: string) => {
    const variants = {
      primary: {
        gradient: 'gradient-primary',
        iconBg: 'from-primary-50 to-primary-100',
        iconColor: 'text-primary-600',
        border: 'border-primary-200',
        hoverBg: 'hover:bg-primary-50'
      },
      earth: {
        gradient: 'gradient-earth',
        iconBg: 'from-earth-50 to-earth-100',
        iconColor: 'text-earth-600',
        border: 'border-earth-200',
        hoverBg: 'hover:bg-earth-50'
      },
      sky: {
        gradient: 'gradient-sky',
        iconBg: 'from-sky-50 to-sky-100',
        iconColor: 'text-sky-600',
        border: 'border-sky-200',
        hoverBg: 'hover:bg-sky-50'
      },
      sunset: {
        gradient: 'gradient-sunset',
        iconBg: 'from-sunset-50 to-sunset-100',
        iconColor: 'text-sunset-600',
        border: 'border-sunset-200',
        hoverBg: 'hover:bg-sunset-50'
      }
    };
    return variants[color as keyof typeof variants] || variants.primary;
  };

  return (
    <div className="card card-hover border-gradient animate-fadeInUp">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-6 gradient-primary rounded-full"></div>
            <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
          </div>
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 hover-lift">
            <SparklesIcon className="h-5 w-5 text-primary-600" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action, index) => {
            const colorVariant = getColorClasses(action.color);
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`group flex items-center p-4 rounded-xl border-2 border-neutral-100 ${colorVariant.hoverBg} hover:border-opacity-50 hover:shadow-lg transition-all duration-300 text-left interactive-subtle animate-fadeInLeft stagger-${index + 1}`}
              >
                <div className={`bg-gradient-to-br ${colorVariant.iconBg} rounded-2xl p-3 mr-4 group-hover:scale-110 transition-all duration-300 shadow-md group-hover:shadow-lg`}>
                  <action.icon className={`h-6 w-6 ${colorVariant.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700 mb-1">
                    {action.name}
                  </h4>
                  <p className="text-xs text-neutral-500 group-hover:text-neutral-600">
                    {action.description}
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;