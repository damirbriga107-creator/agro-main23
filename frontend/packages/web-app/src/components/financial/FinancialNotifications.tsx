import React, { useState } from 'react';
import { 
  BellIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useFinancialWebSocket } from '../../hooks/useFinancialWebSocket';

interface FinancialNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  farmId: string;
  createdAt: string;
  readAt?: string;
  data?: any;
}

interface FinancialNotificationsProps {
  farmId?: string;
}

const FinancialNotifications: React.FC<FinancialNotificationsProps> = ({ farmId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  
  const { 
    notifications, 
    clearNotifications, 
    markNotificationAsRead,
    isConnected 
  } = useFinancialWebSocket({
    farmId,
    subscriptions: ['transactions', 'budgets', 'reports'],
    autoConnect: true
  });

  const unreadCount = notifications.filter(n => !n.readAt).length;
  const displayedNotifications = showOnlyUnread 
    ? notifications.filter(n => !n.readAt)
    : notifications;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'low':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    if (type.includes('transaction') || type.includes('financial')) {
      return <CurrencyDollarIcon className="h-4 w-4" />;
    }
    return <BellIcon className="h-4 w-4" />;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const handleNotificationClick = (notification: FinancialNotification) => {
    if (!notification.readAt) {
      markNotificationAsRead(notification.id);
    }
  };

  const handleClearAll = () => {
    clearNotifications();
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {/* Connection status indicator */}
        <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-400' : 'bg-red-400'
        }`} />
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">Financial Notifications</h3>
              {!isConnected && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                  Disconnected
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowOnlyUnread(!showOnlyUnread)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  showOnlyUnread 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showOnlyUnread ? 'Showing unread' : 'Show unread only'}
              </button>
              <span className="text-xs text-gray-500">
                {unreadCount} unread
              </span>
            </div>
            <button
              onClick={handleClearAll}
              className="text-xs text-red-600 hover:text-red-700"
              disabled={notifications.length === 0}
            >
              Clear all
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {displayedNotifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">
                  {showOnlyUnread ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Financial updates will appear here
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      !notification.readAt ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getSeverityIcon(notification.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.readAt ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1">
                            {getNotificationTypeIcon(notification.type)}
                            {!notification.readAt && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <p className={`text-sm mt-1 ${
                          !notification.readAt ? 'text-gray-800' : 'text-gray-600'
                        }`}>
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(notification.createdAt)}
                          </span>
                          {notification.data?.amount && (
                            <span className="text-xs font-medium text-green-600">
                              ${notification.data.amount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Real-time updates {isConnected ? 'active' : 'unavailable'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinancialNotifications;