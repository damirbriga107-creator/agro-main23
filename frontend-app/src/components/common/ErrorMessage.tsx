import React from 'react';
import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
  type?: 'error' | 'warning';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  title, 
  message, 
  onRetry,
  onClose,
  type = 'error'
}) => {
  const Icon = type === 'error' ? XCircleIcon : ExclamationTriangleIcon;
  const iconColor = type === 'error' ? 'text-red-500' : 'text-yellow-500';
  const borderColor = type === 'error' ? 'border-red-200' : 'border-yellow-200';
  const bgColor = type === 'error' ? 'bg-red-50' : 'bg-yellow-50';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-6 relative`}>
      <div className="flex items-start">
        <Icon className={`h-6 w-6 ${iconColor} mt-0.5`} />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      {onClose && (
        <div className="absolute top-3 right-3">
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;