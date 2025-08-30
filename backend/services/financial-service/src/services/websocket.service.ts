import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Logger } from '@daorsagro/utils';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    role: string;
    farmIds?: string[];
  };
}

/**
 * WebSocket Service for Real-time Financial Updates
 */
export class FinancialWebSocketService {
  private io: SocketIOServer;
  private logger = new Logger('financial-websocket');

  constructor(httpServer: HttpServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/api/v1/financial/socket.io'
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new Error('JWT secret not configured'));
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        socket.user = {
          userId: decoded.userId,
          role: decoded.role,
          farmIds: decoded.farmIds
        };

        this.logger.info(`User ${decoded.userId} connected to financial WebSocket`);
        next();
      } catch (error) {
        this.logger.error('WebSocket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const userId = socket.user?.userId;
    const farmIds = socket.user?.farmIds || [];

    this.logger.info(`Financial WebSocket client connected: ${userId}`);

    // Join user-specific rooms
    socket.join(`user:${userId}`);
    farmIds.forEach(farmId => {
      socket.join(`farm:${farmId}`);
    });

    // Handle subscription requests
    socket.on('subscribe:transactions', (data) => {
      this.handleTransactionSubscription(socket, data);
    });

    socket.on('subscribe:budgets', (data) => {
      this.handleBudgetSubscription(socket, data);
    });

    socket.on('subscribe:reports', (data) => {
      this.handleReportSubscription(socket, data);
    });

    socket.on('unsubscribe:transactions', () => {
      socket.leave('transactions');
    });

    socket.on('unsubscribe:budgets', () => {
      socket.leave('budgets');
    });

    socket.on('unsubscribe:reports', () => {
      socket.leave('reports');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.logger.info(`Financial WebSocket client disconnected: ${userId}`);
    });

    // Send initial data
    this.sendInitialFinancialData(socket);
  }

  /**
   * Handle transaction subscription
   */
  private handleTransactionSubscription(socket: AuthenticatedSocket, data: any): void {
    const { farmId } = data;
    
    // Validate access to farm
    if (farmId && !socket.user?.farmIds?.includes(farmId)) {
      socket.emit('error', { message: 'Access denied to farm' });
      return;
    }

    socket.join('transactions');
    if (farmId) {
      socket.join(`transactions:${farmId}`);
    }

    this.logger.info(`User ${socket.user?.userId} subscribed to transactions for farm ${farmId}`);
  }

  /**
   * Handle budget subscription
   */
  private handleBudgetSubscription(socket: AuthenticatedSocket, data: any): void {
    const { farmId } = data;
    
    // Validate access to farm
    if (farmId && !socket.user?.farmIds?.includes(farmId)) {
      socket.emit('error', { message: 'Access denied to farm' });
      return;
    }

    socket.join('budgets');
    if (farmId) {
      socket.join(`budgets:${farmId}`);
    }

    this.logger.info(`User ${socket.user?.userId} subscribed to budgets for farm ${farmId}`);
  }

  /**
   * Handle report subscription
   */
  private handleReportSubscription(socket: AuthenticatedSocket, data: any): void {
    const { farmId } = data;
    
    // Validate access to farm
    if (farmId && !socket.user?.farmIds?.includes(farmId)) {
      socket.emit('error', { message: 'Access denied to farm' });
      return;
    }

    socket.join('reports');
    if (farmId) {
      socket.join(`reports:${farmId}`);
    }

    this.logger.info(`User ${socket.user?.userId} subscribed to reports for farm ${farmId}`);
  }

  /**
   * Send initial financial data to new clients
   */
  private async sendInitialFinancialData(socket: AuthenticatedSocket): Promise<void> {
    try {
      // Send welcome message with available subscriptions
      socket.emit('financial:connected', {
        message: 'Connected to financial real-time updates',
        availableSubscriptions: [
          'transactions',
          'budgets', 
          'reports'
        ],
        userId: socket.user?.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error sending initial financial data:', error);
    }
  }

  /**
   * Broadcast transaction update
   */
  public broadcastTransactionUpdate(transaction: any): void {
    const event = {
      type: 'transaction:updated',
      data: transaction,
      timestamp: new Date().toISOString()
    };

    // Broadcast to all transaction subscribers
    this.io.to('transactions').emit('financial:transaction:updated', event);
    
    // Broadcast to farm-specific subscribers
    if (transaction.farmId) {
      this.io.to(`transactions:${transaction.farmId}`).emit('financial:transaction:updated', event);
      this.io.to(`farm:${transaction.farmId}`).emit('financial:transaction:updated', event);
    }

    this.logger.info(`Broadcasted transaction update: ${transaction.id}`);
  }

  /**
   * Broadcast new transaction
   */
  public broadcastTransactionCreated(transaction: any): void {
    const event = {
      type: 'transaction:created',
      data: transaction,
      timestamp: new Date().toISOString()
    };

    this.io.to('transactions').emit('financial:transaction:created', event);
    
    if (transaction.farmId) {
      this.io.to(`transactions:${transaction.farmId}`).emit('financial:transaction:created', event);
      this.io.to(`farm:${transaction.farmId}`).emit('financial:transaction:created', event);
    }

    this.logger.info(`Broadcasted new transaction: ${transaction.id}`);
  }

  /**
   * Broadcast transaction deletion
   */
  public broadcastTransactionDeleted(transactionId: string, farmId: string): void {
    const event = {
      type: 'transaction:deleted',
      data: { id: transactionId, farmId },
      timestamp: new Date().toISOString()
    };

    this.io.to('transactions').emit('financial:transaction:deleted', event);
    this.io.to(`transactions:${farmId}`).emit('financial:transaction:deleted', event);
    this.io.to(`farm:${farmId}`).emit('financial:transaction:deleted', event);

    this.logger.info(`Broadcasted transaction deletion: ${transactionId}`);
  }

  /**
   * Broadcast budget update
   */
  public broadcastBudgetUpdate(budget: any): void {
    const event = {
      type: 'budget:updated',
      data: budget,
      timestamp: new Date().toISOString()
    };

    this.io.to('budgets').emit('financial:budget:updated', event);
    
    if (budget.farmId) {
      this.io.to(`budgets:${budget.farmId}`).emit('financial:budget:updated', event);
      this.io.to(`farm:${budget.farmId}`).emit('financial:budget:updated', event);
    }

    this.logger.info(`Broadcasted budget update: ${budget.id}`);
  }

  /**
   * Broadcast budget created
   */
  public broadcastBudgetCreated(budget: any): void {
    const event = {
      type: 'budget:created',
      data: budget,
      timestamp: new Date().toISOString()
    };

    this.io.to('budgets').emit('financial:budget:created', event);
    
    if (budget.farmId) {
      this.io.to(`budgets:${budget.farmId}`).emit('financial:budget:created', event);
      this.io.to(`farm:${budget.farmId}`).emit('financial:budget:created', event);
    }

    this.logger.info(`Broadcasted new budget: ${budget.id}`);
  }

  /**
   * Broadcast financial alert
   */
  public broadcastFinancialAlert(alert: {
    type: 'budget_exceeded' | 'low_balance' | 'payment_due' | 'revenue_milestone';
    title: string;
    message: string;
    farmId: string;
    severity: 'low' | 'medium' | 'high';
    data?: any;
  }): void {
    const event = {
      type: 'financial:alert',
      data: alert,
      timestamp: new Date().toISOString()
    };

    // Send to farm-specific users
    this.io.to(`farm:${alert.farmId}`).emit('financial:alert', event);

    this.logger.info(`Broadcasted financial alert: ${alert.type} for farm ${alert.farmId}`);
  }

  /**
   * Send financial summary update
   */
  public broadcastFinancialSummaryUpdate(summary: any, farmId: string): void {
    const event = {
      type: 'financial:summary:updated',
      data: summary,
      timestamp: new Date().toISOString()
    };

    this.io.to(`farm:${farmId}`).emit('financial:summary:updated', event);
    this.io.to('reports').emit('financial:summary:updated', event);

    this.logger.info(`Broadcasted financial summary update for farm ${farmId}`);
  }

  /**
   * Get connected clients count
   */
  public getConnectedClientsCount(): number {
    return this.io.engine.clientsCount;
  }

  /**
   * Get connected clients for a specific farm
   */
  public getConnectedClientsForFarm(farmId: string): number {
    const room = this.io.sockets.adapter.rooms.get(`farm:${farmId}`);
    return room ? room.size : 0;
  }
}