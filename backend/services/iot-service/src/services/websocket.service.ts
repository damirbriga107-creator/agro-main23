import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '@daorsagro/utils';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  farmId?: string;
  subscriptions?: Set<string>;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'data_request';
  payload: any;
  timestamp?: string;
}

interface Subscription {
  deviceId?: string;
  farmId?: string;
  dataType?: string;
  alertTypes?: string[];
  real_time?: boolean;
}

export class WebSocketHandler {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> client IDs
  private heartbeatInterval: NodeJS.Timeout;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  /**
   * Setup WebSocket server with authentication and message handling
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, request: IncomingMessage): Promise<void> {
    try {
      // Extract auth token from query parameters or headers
      const url = new URL(request.url!, 'http://localhost');
      const token = url.searchParams.get('token') || 
                   request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as any;

      ws.userId = decoded.id || decoded.userId;
      ws.farmId = decoded.farmId;
      ws.subscriptions = new Set();
      ws.isAlive = true;

      // Generate client ID
      const clientId = `${ws.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.clients.set(clientId, ws);

      logger.info('WebSocket client connected', {
        clientId,
        userId: ws.userId,
        farmId: ws.farmId,
        userAgent: request.headers['user-agent']
      });

      // Setup message handlers
      ws.on('message', (data) => {
        this.handleMessage(clientId, ws, data);
      });

      ws.on('close', (code, reason) => {
        this.handleDisconnection(clientId, ws, code, reason);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket client error:', { clientId, error });
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'welcome',
        payload: {
          clientId,
          message: 'Connected to DaorsAgro IoT WebSocket service',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('WebSocket authentication failed:', error);
      ws.close(1008, 'Authentication failed');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(
    clientId: string, 
    ws: AuthenticatedWebSocket, 
    data: Buffer | string
  ): void {
    try {
      const messageStr = data.toString();
      let message: WebSocketMessage;

      try {
        message = JSON.parse(messageStr);
      } catch (parseError) {
        logger.warn('Invalid WebSocket message format:', { clientId, messageStr });
        this.sendError(ws, 'Invalid message format');
        return;
      }

      logger.debug('WebSocket message received', {
        clientId,
        type: message.type,
        userId: ws.userId
      });

      // Handle different message types
      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, ws, message.payload);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscribe(clientId, ws, message.payload);
          break;
        
        case 'ping':
          this.handlePing(ws);
          break;
        
        case 'data_request':
          this.handleDataRequest(clientId, ws, message.payload);
          break;
        
        default:
          logger.warn('Unknown WebSocket message type:', { clientId, type: message.type });
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', { clientId, error });
      this.sendError(ws, 'Internal server error');
    }
  }

  /**
   * Handle subscription requests
   */
  private handleSubscribe(
    clientId: string, 
    ws: AuthenticatedWebSocket, 
    subscription: Subscription
  ): void {
    try {
      // Validate subscription
      if (!this.validateSubscription(subscription, ws)) {
        this.sendError(ws, 'Invalid subscription parameters');
        return;
      }

      // Create subscription topic
      const topic = this.createSubscriptionTopic(subscription, ws.userId!, ws.farmId);
      
      // Add client to subscription
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      this.subscriptions.get(topic)!.add(clientId);
      ws.subscriptions!.add(topic);

      logger.info('Client subscribed to topic', {
        clientId,
        topic,
        subscription
      });

      // Send confirmation
      this.sendMessage(ws, {
        type: 'subscribed',
        payload: {
          topic,
          subscription,
          message: 'Successfully subscribed'
        }
      });

      // Send initial data if requested
      if (subscription.real_time) {
        this.sendInitialData(ws, subscription);
      }
    } catch (error) {
      logger.error('Error handling subscription:', { clientId, error });
      this.sendError(ws, 'Subscription failed');
    }
  }

  /**
   * Handle unsubscription requests
   */
  private handleUnsubscribe(
    clientId: string, 
    ws: AuthenticatedWebSocket, 
    subscription: Subscription
  ): void {
    try {
      const topic = this.createSubscriptionTopic(subscription, ws.userId!, ws.farmId);
      
      // Remove client from subscription
      if (this.subscriptions.has(topic)) {
        this.subscriptions.get(topic)!.delete(clientId);
        
        // Clean up empty subscriptions
        if (this.subscriptions.get(topic)!.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
      
      ws.subscriptions!.delete(topic);

      logger.info('Client unsubscribed from topic', {
        clientId,
        topic,
        subscription
      });

      // Send confirmation
      this.sendMessage(ws, {
        type: 'unsubscribed',
        payload: {
          topic,
          message: 'Successfully unsubscribed'
        }
      });
    } catch (error) {
      logger.error('Error handling unsubscription:', { clientId, error });
      this.sendError(ws, 'Unsubscription failed');
    }
  }

  /**
   * Handle ping messages for keepalive
   */
  private handlePing(ws: AuthenticatedWebSocket): void {
    ws.isAlive = true;
    this.sendMessage(ws, {
      type: 'pong',
      payload: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Handle data request messages
   */
  private async handleDataRequest(
    clientId: string, 
    ws: AuthenticatedWebSocket, 
    request: any
  ): Promise<void> {
    try {
      // This would integrate with IoT service to fetch requested data
      // For now, send a placeholder response
      
      this.sendMessage(ws, {
        type: 'data_response',
        payload: {
          requestId: request.requestId,
          data: [], // Would contain actual sensor data
          message: 'Data request processed'
        }
      });
    } catch (error) {
      logger.error('Error handling data request:', { clientId, error });
      this.sendError(ws, 'Data request failed');
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(
    clientId: string, 
    ws: AuthenticatedWebSocket, 
    code: number, 
    reason: Buffer
  ): void {
    logger.info('WebSocket client disconnected', {
      clientId,
      userId: ws.userId,
      code,
      reason: reason.toString()
    });

    // Clean up subscriptions
    if (ws.subscriptions) {
      ws.subscriptions.forEach(topic => {
        if (this.subscriptions.has(topic)) {
          this.subscriptions.get(topic)!.delete(clientId);
          
          // Clean up empty subscriptions
          if (this.subscriptions.get(topic)!.size === 0) {
            this.subscriptions.delete(topic);
          }
        }
      });
    }

    // Remove client
    this.clients.delete(clientId);
  }

  /**
   * Broadcast sensor data to subscribed clients
   */
  broadcastSensorData(data: {
    deviceId: string;
    farmId: string;
    userId: string;
    dataType: string;
    value: any;
    unit: string;
    timestamp: Date;
    location?: any;
  }): void {
    try {
      // Create topic patterns to match
      const topics = [
        `sensor:${data.farmId}:${data.deviceId}:${data.dataType}`,
        `sensor:${data.farmId}:${data.deviceId}:*`,
        `sensor:${data.farmId}:*:${data.dataType}`,
        `sensor:${data.farmId}:*:*`,
        `sensor:*:*:*`
      ];

      const message = {
        type: 'sensor_data',
        payload: {
          deviceId: data.deviceId,
          farmId: data.farmId,
          dataType: data.dataType,
          value: data.value,
          unit: data.unit,
          timestamp: data.timestamp.toISOString(),
          location: data.location
        }
      };

      // Find matching subscriptions and send to clients
      let sentCount = 0;
      topics.forEach(topic => {
        if (this.subscriptions.has(topic)) {
          const clientIds = this.subscriptions.get(topic)!;
          clientIds.forEach(clientId => {
            const client = this.clients.get(clientId);
            if (client && client.readyState === WebSocket.OPEN) {
              // Additional authorization check
              if (client.userId === data.userId || client.farmId === data.farmId) {
                this.sendMessage(client, message);
                sentCount++;
              }
            }
          });
        }
      });

      if (sentCount > 0) {
        logger.debug('Sensor data broadcasted', {
          deviceId: data.deviceId,
          dataType: data.dataType,
          clientCount: sentCount
        });
      }
    } catch (error) {
      logger.error('Error broadcasting sensor data:', error);
    }
  }

  /**
   * Broadcast alert to subscribed clients
   */
  broadcastAlert(alert: {
    deviceId: string;
    farmId: string;
    userId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    timestamp: Date;
  }): void {
    try {
      const topics = [
        `alert:${alert.farmId}:${alert.deviceId}:${alert.type}`,
        `alert:${alert.farmId}:${alert.deviceId}:*`,
        `alert:${alert.farmId}:*:${alert.type}`,
        `alert:${alert.farmId}:*:*`,
        `alert:*:*:*`
      ];

      const message = {
        type: 'alert',
        payload: {
          deviceId: alert.deviceId,
          farmId: alert.farmId,
          alertType: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          timestamp: alert.timestamp.toISOString()
        }
      };

      // Send to matching subscribers
      let sentCount = 0;
      topics.forEach(topic => {
        if (this.subscriptions.has(topic)) {
          const clientIds = this.subscriptions.get(topic)!;
          clientIds.forEach(clientId => {
            const client = this.clients.get(clientId);
            if (client && client.readyState === WebSocket.OPEN) {
              if (client.userId === alert.userId || client.farmId === alert.farmId) {
                this.sendMessage(client, message);
                sentCount++;
              }
            }
          });
        }
      });

      logger.info('Alert broadcasted', {
        deviceId: alert.deviceId,
        alertType: alert.type,
        severity: alert.severity,
        clientCount: sentCount
      });
    } catch (error) {
      logger.error('Error broadcasting alert:', error);
    }
  }

  /**
   * Send message to WebSocket client
   */
  private sendMessage(ws: AuthenticatedWebSocket, message: any): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      logger.error('Error sending WebSocket message:', error);
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: AuthenticatedWebSocket, errorMessage: string): void {
    this.sendMessage(ws, {
      type: 'error',
      payload: {
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Start heartbeat to detect disconnected clients
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          logger.info('Terminating inactive WebSocket client', { clientId });
          client.terminate();
          this.clients.delete(clientId);
          return;
        }

        client.isAlive = false;
        if (client.readyState === WebSocket.OPEN) {
          client.ping();
        }
      });
    }, 30000); // 30 seconds
  }

  /**
   * Validate subscription parameters
   */
  private validateSubscription(subscription: Subscription, ws: AuthenticatedWebSocket): boolean {
    // Ensure user can only subscribe to their own data
    if (subscription.farmId && subscription.farmId !== ws.farmId) {
      return false;
    }

    return true;
  }

  /**
   * Create subscription topic string
   */
  private createSubscriptionTopic(
    subscription: Subscription, 
    userId: string, 
    farmId?: string
  ): string {
    const parts = [];
    
    if (subscription.deviceId) {
      parts.push(`sensor:${farmId || '*'}:${subscription.deviceId}:${subscription.dataType || '*'}`);
    } else if (subscription.alertTypes) {
      parts.push(`alert:${farmId || '*'}:*:${subscription.alertTypes.join('|')}`);
    } else {
      parts.push(`sensor:${farmId || '*'}:*:*`);
    }

    return parts[0];
  }

  /**
   * Send initial data for subscription
   */
  private async sendInitialData(ws: AuthenticatedWebSocket, subscription: Subscription): Promise<void> {
    // This would fetch recent data from IoT service and send to client
    // For now, just send a placeholder
    
    this.sendMessage(ws, {
      type: 'initial_data',
      payload: {
        subscription,
        data: [], // Would contain recent sensor data
        message: 'Initial data sent'
      }
    });
  }

  /**
   * Get WebSocket server statistics
   */
  getStats(): {
    connectedClients: number;
    totalSubscriptions: number;
    activeTopics: number;
  } {
    return {
      connectedClients: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values())
        .reduce((sum, clientSet) => sum + clientSet.size, 0),
      activeTopics: this.subscriptions.size
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutting down');
      }
    });

    this.clients.clear();
    this.subscriptions.clear();
  }
}