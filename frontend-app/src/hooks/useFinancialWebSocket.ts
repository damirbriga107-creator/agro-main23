import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

interface FinancialEvent {
  type: string;
  data: any;
  timestamp: string;
}

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

interface UseFinancialWebSocketOptions {
  farmId?: string;
  subscriptions?: ('transactions' | 'budgets' | 'reports')[];
  autoConnect?: boolean;
}

interface UseFinancialWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  notifications: FinancialNotification[];
  lastEvent: FinancialEvent | null;
  subscribe: (type: 'transactions' | 'budgets' | 'reports', farmId?: string) => void;
  unsubscribe: (type: 'transactions' | 'budgets' | 'reports') => void;
  connect: () => void;
  disconnect: () => void;
  clearNotifications: () => void;
  markNotificationAsRead: (notificationId: string) => void;
}

/**
 * Custom hook for managing financial WebSocket connections and real-time updates
 */
export const useFinancialWebSocket = (
  options: UseFinancialWebSocketOptions = {}
): UseFinancialWebSocketReturn => {
  const { farmId, subscriptions = [], autoConnect = true } = options;
  const { user, getToken } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<FinancialNotification[]>([]);
  const [lastEvent, setLastEvent] = useState<FinancialEvent | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    const token = getToken();
    if (!token) {
      console.warn('No authentication token available for WebSocket connection');
      return;
    }

    const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
    const socketURL = baseURL.replace('/api', '').replace('http', 'ws');

    const newSocket = io(socketURL, {
      path: '/api/v1/financial/socket.io',
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to financial WebSocket');
      setIsConnected(true);
      
      // Auto-subscribe to specified subscriptions
      subscriptions.forEach(subscription => {
        newSocket.emit(`subscribe:${subscription}`, { farmId });
      });
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('Disconnected from financial WebSocket:', reason);
      setIsConnected(false);
      
      // Attempt to reconnect after a delay
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('Financial WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Listen for financial events
    newSocket.on('financial:connected', (data: any) => {
      console.log('Financial WebSocket connected:', data);
    });

    newSocket.on('financial:transaction:created', (event: FinancialEvent) => {
      setLastEvent(event);
      console.log('Transaction created:', event.data);
    });

    newSocket.on('financial:transaction:updated', (event: FinancialEvent) => {
      setLastEvent(event);
      console.log('Transaction updated:', event.data);
    });

    newSocket.on('financial:transaction:deleted', (event: FinancialEvent) => {
      setLastEvent(event);
      console.log('Transaction deleted:', event.data);
    });

    newSocket.on('financial:budget:created', (event: FinancialEvent) => {
      setLastEvent(event);
      console.log('Budget created:', event.data);
    });

    newSocket.on('financial:budget:updated', (event: FinancialEvent) => {
      setLastEvent(event);
      console.log('Budget updated:', event.data);
    });

    newSocket.on('financial:summary:updated', (event: FinancialEvent) => {
      setLastEvent(event);
      console.log('Financial summary updated:', event.data);
    });

    newSocket.on('financial:notification', (event: FinancialEvent) => {
      const notification = event.data as FinancialNotification;
      setNotifications((prev: FinancialNotification[]) => [notification, ...prev].slice(0, 50)); // Keep last 50 notifications
      console.log('Financial notification:', notification);
    });

    newSocket.on('financial:alert', (event: FinancialEvent) => {
      const alert = event.data;
      
      // Create a notification from the alert
      const notification: FinancialNotification = {
        id: `alert_${Date.now()}`,
        type: 'alert',
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        farmId: alert.farmId,
        createdAt: event.timestamp,
        data: alert.data
      };
      
      setNotifications((prev: FinancialNotification[]) => [notification, ...prev].slice(0, 50));
      setLastEvent(event);
      
      console.log('Financial alert:', alert);
    });

    newSocket.on('error', (error: any) => {
      console.error('Financial WebSocket error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [farmId, subscriptions, getToken]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  /**
   * Subscribe to a specific financial event type
   */
  const subscribe = useCallback((type: 'transactions' | 'budgets' | 'reports', targetFarmId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${type}`, { farmId: targetFarmId || farmId });
      console.log(`Subscribed to ${type} for farm ${targetFarmId || farmId}`);
    }
  }, [farmId]);

  /**
   * Unsubscribe from a specific financial event type
   */
  const unsubscribe = useCallback((type: 'transactions' | 'budgets' | 'reports') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`unsubscribe:${type}`);
      console.log(`Unsubscribed from ${type}`);
    }
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Mark a notification as read
   */
  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications((prev: FinancialNotification[]) => 
      prev.map((notification: FinancialNotification) => 
        notification.id === notificationId 
          ? { ...notification, readAt: new Date().toISOString() }
          : notification
      )
    );
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user, connect, disconnect]);

  // Reconnect when user changes
  useEffect(() => {
    if (user && socketRef.current) {
      disconnect();
      setTimeout(connect, 1000);
    }
  }, [user?.userId, connect, disconnect]);

  return {
    socket,
    isConnected,
    notifications,
    lastEvent,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    clearNotifications,
    markNotificationAsRead
  };
};