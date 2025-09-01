import React from 'react';
import { IconType } from '@heroicons/react/24/outline';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>; 
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  color?: 'primary' | 'earth' | 'sky' | 'sunset';
  className?: string;
  animationDelay?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  className = '',
  animationDelay = 0
}) => {
  const colorVariants = {
    primary: {
      gradient: 'gradient-primary',
      iconBg: 'from-primary-50 to-primary-100',
      iconColor: 'text-primary-600',
      trendUp: 'text-primary-600',
      trendDown: 'text-error-600',
      border: 'border-primary-200',
      glow: 'hover-glow'
    },
    earth: {
      gradient: 'gradient-earth',
      iconBg: 'from-earth-50 to-earth-100',
      iconColor: 'text-earth-600',
      trendUp: 'text-earth-600',
      trendDown: 'text-error-600',
      border: 'border-earth-200',
      glow: 'hover-earth-glow'
    },
    sky: {
      gradient: 'gradient-sky',
      iconBg: 'from-sky-50 to-sky-100',
      iconColor: 'text-sky-600',
      trendUp: 'text-sky-600',
      trendDown: 'text-error-600',
      border: 'border-sky-200',
      glow: 'hover-sky-glow'
    },
    sunset: {
      gradient: 'gradient-sunset',
      iconBg: 'from-sunset-50 to-sunset-100',
      iconColor: 'text-sunset-600',
      trendUp: 'text-sunset-600',
      trendDown: 'text-error-600',
      border: 'border-sunset-200',
      glow: 'hover-sunset-glow'
    }
  };

  const variant = colorVariants[color];

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <div 
      className={`card card-hover ${variant.glow} border-2 ${variant.border} animate-fadeInUp ${className}`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-2xl bg-gradient-to-br ${variant.iconBg} shadow-md`}>
            <Icon className={`h-6 w-6 ${variant.iconColor}`} />
          </div>
          {trend && (
            <div className={`flex items-center text-sm font-medium ${
              trend.direction === 'up' ? variant.trendUp : variant.trendDown
            }`}>
              <svg 
                className={`w-4 h-4 mr-1 transform ${
                  trend.direction === 'down' ? 'rotate-180' : ''
                }`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path 
                  fillRule="evenodd" 
                  d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" 
                  clipRule="evenodd" 
                />
              </svg>
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-600 uppercase tracking-wide">
            {title}
          </h3>
          <div className="text-3xl font-bold text-neutral-900 animate-scaleIn">
            {formatValue(value)}
          </div>
          {subtitle && (
            <p className="text-sm text-neutral-500">
              {subtitle}
            </p>
          )}
          {trend && (
            <p className="text-xs text-neutral-400 mt-2">
              {trend.label}
            </p>
          )}
        </div>
      </div>
      
      {/* Decorative gradient line */}
      <div className={`h-1 ${variant.gradient} rounded-b-2xl`}></div>
    </div>
  );
};

export default MetricCard;