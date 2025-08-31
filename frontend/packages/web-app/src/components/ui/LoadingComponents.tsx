import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  rows?: number;
  showAvatar?: boolean;
  type?: 'card' | 'list' | 'chart' | 'table';
}

const LoadingCard: React.FC = () => (
  <div className="card animate-scaleIn">
    <div className="p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-br from-neutral-200 to-neutral-300 rounded-2xl loading-skeleton"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 loading-skeleton rounded-lg w-3/4"></div>
          <div className="h-3 loading-skeleton rounded-lg w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-8 loading-skeleton rounded-lg w-1/3"></div>
        <div className="h-4 loading-skeleton rounded-lg w-full"></div>
        <div className="h-4 loading-skeleton rounded-lg w-2/3"></div>
      </div>
    </div>
    <div className="h-1 bg-gradient-to-r from-primary-200 to-sky-200 rounded-b-2xl loading-skeleton"></div>
  </div>
);

const LoadingList: React.FC<{ rows: number }> = ({ rows }) => (
  <div className="card animate-scaleIn">
    <div className="p-6">
      <div className="h-6 loading-skeleton rounded-lg w-1/4 mb-6"></div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center space-x-4 animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="w-10 h-10 loading-skeleton rounded-xl"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 loading-skeleton rounded-lg w-3/4"></div>
              <div className="h-3 loading-skeleton rounded-lg w-1/2"></div>
            </div>
            <div className="w-16 h-6 loading-skeleton rounded-lg"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LoadingChart: React.FC = () => (
  <div className="card animate-scaleIn">
    <div className="p-6">
      <div className="h-6 loading-skeleton rounded-lg w-1/3 mb-6"></div>
      <div className="h-64 loading-skeleton rounded-xl mb-4"></div>
      <div className="flex justify-between">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-4 w-16 loading-skeleton rounded-lg animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}></div>
        ))}
      </div>
    </div>
  </div>
);

const LoadingTable: React.FC<{ rows: number }> = ({ rows }) => (
  <div className="card animate-scaleIn">
    <div className="p-6">
      <div className="h-6 loading-skeleton rounded-lg w-1/4 mb-6"></div>
      {/* Table header */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-4 loading-skeleton rounded-lg"></div>
        ))}
      </div>
      {/* Table rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4 animate-fadeInUp" style={{ animationDelay: `${rowIndex * 100}ms` }}>
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 loading-skeleton rounded-lg"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  className = '', 
  rows = 3, 
  type = 'card' 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return <LoadingList rows={rows} />;
      case 'chart':
        return <LoadingChart />;
      case 'table':
        return <LoadingTable rows={rows} />;
      default:
        return <LoadingCard />;
    }
  };

  return (
    <div className={className}>
      {renderSkeleton()}
    </div>
  );
};

// Enhanced Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'earth' | 'sky' | 'sunset';
  className?: string;
  text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  color = 'primary',
  className = '',
  text
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-primary-600',
    earth: 'text-earth-600',
    sky: 'text-sky-600',
    sunset: 'text-sunset-600'
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} ${colorClasses[color]} animate-spin`}>
          <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        {/* Pulsing ring effect */}
        <div className={`absolute inset-0 ${sizeClasses[size]} ${colorClasses[color]} opacity-20 animate-ping rounded-full`}></div>
      </div>
      {text && (
        <p className="text-sm text-neutral-600 animate-pulse">{text}</p>
      )}
    </div>
  );
};

export { LoadingSkeleton, LoadingSpinner };