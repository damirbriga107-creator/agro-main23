import { Producer } from 'kafkajs';
import { Logger } from '@daorsagro/utils';
import { FinancialWebSocketService } from './websocket.service';

export interface FinancialNotification {
  id: string;
  type: 'transaction_created' | 'transaction_updated' | 'budget_exceeded' | 'budget_warning' | 'payment_reminder' | 'financial_milestone';
  title: string;
  message: string;
  farmId: string;
  userId?: string;
  severity: 'low' | 'medium' | 'high';
  data?: any;
  createdAt: Date;
  readAt?: Date;
}

/**
 * Financial Notification Service
 * Handles real-time notifications for financial events
 */
export class FinancialNotificationService {
  private logger = new Logger('financial-notifications');

  constructor(
    private kafkaProducer: Producer,
    private webSocketService: FinancialWebSocketService
  ) {}

  /**
   * Create and send a financial notification
   */
  async createNotification(notification: Omit<FinancialNotification, 'id' | 'createdAt'>): Promise<void> {
    try {
      const fullNotification: FinancialNotification = {
        ...notification,
        id: this.generateNotificationId(),
        createdAt: new Date()
      };

      // Send to Kafka for persistence and processing
      await this.sendToKafka(fullNotification);

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(fullNotification);

      // Send alert if high severity
      if (notification.severity === 'high') {
        await this.sendFinancialAlert(fullNotification);
      }

      this.logger.info(`Financial notification sent: ${fullNotification.type} for farm ${fullNotification.farmId}`);
    } catch (error) {
      this.logger.error('Error creating financial notification:', error);
      throw error;
    }
  }

  /**
   * Send transaction-related notifications
   */
  async notifyTransactionCreated(transaction: any): Promise<void> {
    const isLargeTransaction = transaction.amount > 10000; // Configurable threshold
    const severity = isLargeTransaction ? 'high' : 'medium';

    await this.createNotification({
      type: 'transaction_created',
      title: `New ${transaction.transactionType.toLowerCase()} recorded`,
      message: `${transaction.transactionType === 'INCOME' ? 'Income' : 'Expense'} of $${transaction.amount.toLocaleString()} has been recorded for ${transaction.description}`,
      farmId: transaction.farmId,
      userId: transaction.userId,
      severity,
      data: {
        transactionId: transaction.id,
        amount: transaction.amount,
        type: transaction.transactionType,
        category: transaction.category?.name
      }
    });
  }

  /**
   * Send budget-related notifications
   */
  async notifyBudgetExceeded(budget: any, categoryName: string, exceededAmount: number): Promise<void> {
    await this.createNotification({
      type: 'budget_exceeded',
      title: 'Budget Exceeded',
      message: `Budget for "${categoryName}" has been exceeded by $${exceededAmount.toLocaleString()}. Total budget: $${budget.totalBudget.toLocaleString()}`,
      farmId: budget.farmId,
      severity: 'high',
      data: {
        budgetId: budget.id,
        budgetName: budget.name,
        categoryName,
        exceededAmount,
        totalBudget: budget.totalBudget
      }
    });
  }

  /**
   * Send budget warning (80% threshold)
   */
  async notifyBudgetWarning(budget: any, categoryName: string, usagePercentage: number): Promise<void> {
    await this.createNotification({
      type: 'budget_warning',
      title: 'Budget Warning',
      message: `Budget for "${categoryName}" is at ${usagePercentage.toFixed(1)}% capacity. Consider reviewing your expenses.`,
      farmId: budget.farmId,
      severity: 'medium',
      data: {
        budgetId: budget.id,
        budgetName: budget.name,
        categoryName,
        usagePercentage
      }
    });
  }

  /**
   * Send payment reminder notifications
   */
  async notifyPaymentReminder(paymentInfo: {
    farmId: string;
    description: string;
    amount: number;
    dueDate: Date;
    type: string;
  }): Promise<void> {
    const daysUntilDue = Math.ceil((paymentInfo.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const severity = daysUntilDue <= 3 ? 'high' : daysUntilDue <= 7 ? 'medium' : 'low';

    await this.createNotification({
      type: 'payment_reminder',
      title: 'Payment Reminder',
      message: `Payment of $${paymentInfo.amount.toLocaleString()} for ${paymentInfo.description} is due in ${daysUntilDue} days`,
      farmId: paymentInfo.farmId,
      severity,
      data: {
        amount: paymentInfo.amount,
        dueDate: paymentInfo.dueDate,
        daysUntilDue,
        type: paymentInfo.type
      }
    });
  }

  /**
   * Send financial milestone notifications
   */
  async notifyFinancialMilestone(milestone: {
    farmId: string;
    type: 'revenue_target' | 'profit_margin' | 'cost_reduction';
    title: string;
    message: string;
    value: number;
    target?: number;
  }): Promise<void> {
    await this.createNotification({
      type: 'financial_milestone',
      title: milestone.title,
      message: milestone.message,
      farmId: milestone.farmId,
      severity: 'low',
      data: {
        milestoneType: milestone.type,
        value: milestone.value,
        target: milestone.target
      }
    });
  }

  /**
   * Send notification to Kafka for persistence
   */
  private async sendToKafka(notification: FinancialNotification): Promise<void> {
    try {
      await this.kafkaProducer.send({
        topic: 'financial-notifications',
        messages: [{
          key: notification.farmId,
          value: JSON.stringify({
            eventType: 'notification.created',
            notification,
            timestamp: new Date().toISOString()
          })
        }]
      });
    } catch (error) {
      this.logger.warn('Failed to send notification to Kafka:', error);
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  private async sendRealTimeNotification(notification: FinancialNotification): Promise<void> {
    try {
      // Send to WebSocket service for real-time delivery
      const event = {
        type: 'financial:notification',
        data: notification,
        timestamp: new Date().toISOString()
      };

      // The WebSocket service will handle room-based broadcasting
      (this.webSocketService as any).io.to(`farm:${notification.farmId}`).emit('financial:notification', event);

      if (notification.userId) {
        (this.webSocketService as any).io.to(`user:${notification.userId}`).emit('financial:notification', event);
      }
    } catch (error) {
      this.logger.warn('Failed to send real-time notification:', error);
    }
  }

  /**
   * Send high-severity financial alert
   */
  private async sendFinancialAlert(notification: FinancialNotification): Promise<void> {
    this.webSocketService.broadcastFinancialAlert({
      type: this.mapNotificationTypeToAlertType(notification.type),
      title: notification.title,
      message: notification.message,
      farmId: notification.farmId,
      severity: notification.severity,
      data: notification.data
    });
  }

  /**
   * Map notification type to alert type
   */
  private mapNotificationTypeToAlertType(notificationType: string): 'budget_exceeded' | 'low_balance' | 'payment_due' | 'revenue_milestone' {
    switch (notificationType) {
      case 'budget_exceeded':
        return 'budget_exceeded';
      case 'payment_reminder':
        return 'payment_due';
      case 'financial_milestone':
        return 'revenue_milestone';
      default:
        return 'low_balance';
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `fin_notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check budget thresholds and send notifications
   */
  async checkBudgetThresholds(budget: any, actualSpending: any[]): Promise<void> {
    try {
      for (const category of budget.categories) {
        const categorySpending = actualSpending
          .filter(spend => spend.categoryId === category.categoryId)
          .reduce((sum, spend) => sum + parseFloat(spend.amount), 0);

        const usagePercentage = (categorySpending / parseFloat(category.allocatedAmount)) * 100;

        if (usagePercentage > 100) {
          // Budget exceeded
          const exceededAmount = categorySpending - parseFloat(category.allocatedAmount);
          await this.notifyBudgetExceeded(budget, category.category?.name || 'Unknown', exceededAmount);
        } else if (usagePercentage >= 80) {
          // Budget warning (80% threshold)
          await this.notifyBudgetWarning(budget, category.category?.name || 'Unknown', usagePercentage);
        }
      }
    } catch (error) {
      this.logger.error('Error checking budget thresholds:', error);
    }
  }

  /**
   * Process financial insights and send relevant notifications
   */
  async processFinancialInsights(farmId: string, insights: {
    monthlyProfit: number;
    profitTrend: 'increasing' | 'decreasing' | 'stable';
    costEfficiency: number;
    revenueGrowth: number;
  }): Promise<void> {
    try {
      // Revenue milestone notifications
      if (insights.revenueGrowth > 20) {
        await this.notifyFinancialMilestone({
          farmId,
          type: 'revenue_target',
          title: 'Revenue Growth Milestone',
          message: `Congratulations! Your revenue has grown by ${insights.revenueGrowth.toFixed(1)}% this period.`,
          value: insights.revenueGrowth
        });
      }

      // Profit margin notifications
      if (insights.monthlyProfit > 0 && insights.profitTrend === 'increasing') {
        await this.notifyFinancialMilestone({
          farmId,
          type: 'profit_margin',
          title: 'Profit Trend Positive',
          message: `Your profit is trending upward with $${insights.monthlyProfit.toLocaleString()} this month.`,
          value: insights.monthlyProfit
        });
      }

      // Cost efficiency notifications
      if (insights.costEfficiency > 85) {
        await this.notifyFinancialMilestone({
          farmId,
          type: 'cost_reduction',
          title: 'Cost Efficiency Achievement',
          message: `Excellent cost management! Your cost efficiency is at ${insights.costEfficiency.toFixed(1)}%.`,
          value: insights.costEfficiency
        });
      }
    } catch (error) {
      this.logger.error('Error processing financial insights:', error);
    }
  }
}