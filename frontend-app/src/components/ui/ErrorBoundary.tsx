import React, { Component, ReactNode, ErrorInfo } from 'react';
import { LoadingSpinner } from './LoadingComponents';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError?.(error, errorInfo);

    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, () => {
          this.setState({ hasError: false, error: undefined });
        });
      }

      return (
        <div className="min-h-screen gradient-mesh flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg w-full space-y-8">
            <div className="text-center animate-fadeInUp">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-3xl gradient-primary shadow-lg hover-lift mb-6">
                <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-4xl font-bold text-gradient-primary mb-3">
                Oops! Something went wrong
              </h2>
              <p className="text-lg text-neutral-600 mb-6">
                We're sorry for the inconvenience. Please try refreshing the page.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary py-4 px-8 text-lg font-semibold inline-block hover-lift"
                >
                  Refresh Page
                </button>
                <div className="text-sm text-neutral-500">
                  Error: {this.state.error?.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for error handling
export const useErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    console.error(`[${context || 'Unknown'}] Error:`, error);
    // Here you could integrate with error reporting services like Sentry
  };

  const handleApiError = (error: any): {
    message: string;
    type: 'network' | 'auth' | 'server' | 'validation' | 'unknown';
    canRetry: boolean;
  } => {
    if (!error) {
      return { message: 'An unexpected error occurred', type: 'unknown', canRetry: true };
    }

    // Network errors
    if (!navigator.onLine) {
      return { message: 'Please check your internet connection and try again', type: 'network', canRetry: true };
    }

    // HTTP status based errors
    if (error.response?.status) {
      switch (error.response.status) {
        case 400:
          return { message: 'Invalid request. Please check your input and try again', type: 'validation', canRetry: false };
        case 401:
          return { message: 'Please sign in to continue', type: 'auth', canRetry: false };
        case 403:
          return { message: 'You don\'t have permission to perform this action', type: 'auth', canRetry: false };
        case 404:
          return { message: 'The requested resource was not found', type: 'server', canRetry: false };
        case 429:
          return { message: 'Too many requests. Please wait a moment and try again', type: 'server', canRetry: true };
        case 500:
        case 502:
        case 503:
          return { message: 'Server error. Our team has been notified', type: 'server', canRetry: true };
        default:
          return { message: 'An error occurred. Please try again', type: 'unknown', canRetry: true };
      }
    }

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network')) {
      return { message: 'Network error. Please check your connection and try again', type: 'network', canRetry: true };
    }

    // Timeout errors
    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      return { message: 'Request timed out. Please try again', type: 'network', canRetry: true };
    }

    return { message: error.message || 'An error occurred', type: 'unknown', canRetry: true };
  };

  return { reportError, handleApiError };
};

// Generic Error Component
interface ErrorDisplayProps {
  error: any;
  onRetry?: () => void;
  compact?: boolean;
  context?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  compact = false,
  context
}) => {
  const { handleApiError } = useErrorHandler();
  const errorInfo = handleApiError(error);

  if (compact) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-800 text-sm font-medium">{errorInfo.message}</span>
          </div>
          {onRetry && errorInfo.canRetry && (
            <button
              onClick={onRetry}
              className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-red-200 rounded-2xl p-8 animate-fadeIn shadow-lg">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-3xl bg-red-100 mb-6">
          <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h3 className="text-xl font-semibold text-red-800 mb-2">
          {errorInfo.type === 'network' ? 'Connection Error' :
           errorInfo.type === 'auth' ? 'Authentication Required' :
           errorInfo.type === 'server' ? 'Server Error' : 'Error'}
        </h3>

        <p className="text-red-600 mb-6 max-w-md">
          {errorInfo.message}
        </p>

        {onRetry && errorInfo.canRetry && (
          <div className="space-y-3">
            <button
              onClick={onRetry}
              className="btn-primary py-3 px-8 font-semibold hover-lift"
            >
              Try Again
            </button>
            <div className="text-sm text-neutral-500">
              {context && `${context} failed • `} Attempting to retry the operation
            </div>
          </div>
        )}

        {errorInfo.type === 'auth' && (
          <p className="text-sm text-red-500 mt-4">
            Please sign in to your account to continue
          </p>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary;
