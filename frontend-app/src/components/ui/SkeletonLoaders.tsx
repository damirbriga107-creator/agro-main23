import React from 'react';
import { clsx } from '../../lib/design-system';

// Base Skeleton Component
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animated?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  rounded = true,
  animated = true,
}) => {
  const roundedClass = {
    true: 'rounded',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
    false: '',
  };

  return (
    <div
      className={clsx(
        'bg-neutral-200',
        animated && 'animate-pulse',
        typeof rounded === 'boolean' ? (rounded ? 'rounded' : '') : roundedClass[rounded],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
};

// Text Skeleton
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  lineHeight?: string;
  lastLineWidth?: string;
  animated?: boolean;
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
  lines = 1,
  className,
  lineHeight = '1rem',
  lastLineWidth = '75%',
  animated = true,
}) => {
  return (
    <div className={clsx('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          rounded="sm"
          animated={animated}
        />
      ))}
    </div>
  );
};

// Card Skeleton
interface CardSkeletonProps {
  className?: string;
  hasAvatar?: boolean;
  hasImage?: boolean;
  imageHeight?: string;
  titleLines?: number;
  bodyLines?: number;
  hasActions?: boolean;
  animated?: boolean;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  className,
  hasAvatar = false,
  hasImage = false,
  imageHeight = '12rem',
  titleLines = 1,
  bodyLines = 3,
  hasActions = false,
  animated = true,
}) => {
  return (
    <div className={clsx('bg-white rounded-2xl border border-neutral-200 overflow-hidden', className)}>
      {hasImage && (
        <Skeleton
          height={imageHeight}
          rounded={false}
          animated={animated}
        />
      )}
      
      <div className="p-6 space-y-4">
        {hasAvatar && (
          <div className="flex items-center space-x-3">
            <Skeleton
              width="3rem"
              height="3rem"
              rounded="full"
              animated={animated}
            />
            <div className="space-y-1">
              <Skeleton width="8rem" height="1rem" animated={animated} />
              <Skeleton width="6rem" height="0.875rem" animated={animated} />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <TextSkeleton
            lines={titleLines}
            lineHeight="1.25rem"
            animated={animated}
          />
          <TextSkeleton
            lines={bodyLines}
            lineHeight="0.875rem"
            animated={animated}
          />
        </div>
        
        {hasActions && (
          <div className="flex space-x-2 pt-2">
            <Skeleton width="5rem" height="2.5rem" rounded="lg" animated={animated} />
            <Skeleton width="4rem" height="2.5rem" rounded="lg" animated={animated} />
          </div>
        )}
      </div>
    </div>
  );
};

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
  animated?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
  animated = true,
}) => {
  return (
    <div className={clsx('overflow-hidden border border-neutral-200 rounded-2xl bg-white', className)}>
      <table className="min-w-full divide-y divide-neutral-200">
        {hasHeader && (
          <thead className="bg-neutral-50">
            <tr>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <th key={colIndex} className="px-6 py-4">
                  <Skeleton height="1rem" width="80%" animated={animated} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        
        <tbody className="bg-white divide-y divide-neutral-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton
                    height="1rem"
                    width={colIndex === 0 ? '90%' : `${Math.random() * 40 + 60}%`}
                    animated={animated}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Dashboard Skeleton
export const DashboardSkeleton: React.FC<{ className?: string; animated?: boolean }> = ({
  className,
  animated = true,
}) => {
  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <Skeleton width="16rem" height="2rem" animated={animated} />
        <Skeleton width="24rem" height="1rem" animated={animated} />
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton width="3rem" height="3rem" rounded="lg" animated={animated} />
              <Skeleton width="4rem" height="1.5rem" animated={animated} />
            </div>
            <div className="space-y-2">
              <Skeleton width="8rem" height="0.875rem" animated={animated} />
              <Skeleton width="6rem" height="2rem" animated={animated} />
              <Skeleton width="10rem" height="0.75rem" animated={animated} />
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton width="12rem" height="1.5rem" animated={animated} />
            <Skeleton width="6rem" height="2rem" rounded="lg" animated={animated} />
          </div>
          <Skeleton height="20rem" rounded="lg" animated={animated} />
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
          <Skeleton width="10rem" height="1.5rem" animated={animated} />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <Skeleton width="2.5rem" height="2.5rem" rounded="full" animated={animated} />
                <div className="flex-1 space-y-1">
                  <Skeleton width="70%" height="1rem" animated={animated} />
                  <Skeleton width="50%" height="0.875rem" animated={animated} />
                </div>
                <Skeleton width="4rem" height="1.5rem" rounded="lg" animated={animated} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Form Skeleton
export const FormSkeleton: React.FC<{ 
  fields?: number; 
  hasTitle?: boolean; 
  className?: string; 
  animated?: boolean;
}> = ({
  fields = 5,
  hasTitle = true,
  className,
  animated = true,
}) => {
  return (
    <div className={clsx('bg-white rounded-2xl border border-neutral-200 p-6 space-y-6', className)}>
      {hasTitle && (
        <div className="space-y-2">
          <Skeleton width="12rem" height="1.5rem" animated={animated} />
          <Skeleton width="20rem" height="1rem" animated={animated} />
        </div>
      )}
      
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton width="8rem" height="1rem" animated={animated} />
            <Skeleton height="3rem" rounded="lg" animated={animated} />
          </div>
        ))}
      </div>
      
      <div className="flex space-x-3 pt-4">
        <Skeleton width="6rem" height="2.5rem" rounded="lg" animated={animated} />
        <Skeleton width="5rem" height="2.5rem" rounded="lg" animated={animated} />
      </div>
    </div>
  );
};

// List Skeleton
export const ListSkeleton: React.FC<{
  items?: number;
  hasAvatar?: boolean;
  hasMetadata?: boolean;
  className?: string;
  animated?: boolean;
}> = ({
  items = 5,
  hasAvatar = true,
  hasMetadata = true,
  className,
  animated = true,
}) => {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-neutral-200"
        >
          {hasAvatar && (
            <Skeleton width="3rem" height="3rem" rounded="full" animated={animated} />
          )}
          
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height="1rem" animated={animated} />
            {hasMetadata && (
              <div className="flex space-x-4">
                <Skeleton width="4rem" height="0.875rem" animated={animated} />
                <Skeleton width="5rem" height="0.875rem" animated={animated} />
                <Skeleton width="3rem" height="0.875rem" animated={animated} />
              </div>
            )}
          </div>
          
          <Skeleton width="5rem" height="2rem" rounded="lg" animated={animated} />
        </div>
      ))}
    </div>
  );
};

export default Skeleton;