export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled'
}

export enum NotificationType {
  // Financial notifications
  TRANSACTION_CREATED = 'transaction_created',
  BUDGET_EXCEEDED = 'budget_exceeded',
  LOW_BALANCE = 'low_balance',
  PAYMENT_REMINDER = 'payment_reminder',
  
  // Subsidy notifications
  SUBSIDY_DEADLINE = 'subsidy_deadline',
  SUBSIDY_APPROVED = 'subsidy_approved',
  SUBSIDY_REJECTED = 'subsidy_rejected',
  NEW_SUBSIDY_PROGRAM = 'new_subsidy_program',
  
  // Insurance notifications
  POLICY_RENEWAL = 'policy_renewal',
  CLAIM_UPDATE = 'claim_update',
  PREMIUM_DUE = 'premium_due',
  
  // Weather notifications
  WEATHER_ALERT = 'weather_alert',
  FROST_WARNING = 'frost_warning',
  RAIN_FORECAST = 'rain_forecast',
  
  // System notifications
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_VERIFICATION = 'account_verification',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  
  // IoT notifications
  SENSOR_OFFLINE = 'sensor_offline',
  SOIL_MOISTURE_LOW = 'soil_moisture_low',
  TEMPERATURE_ALERT = 'temperature_alert'
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  title: string;
  content: string;
  variables: string[];
  channels?: NotificationChannel[];
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    [key in NotificationChannel]?: boolean;
  };
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels: NotificationChannel[];
      priority: NotificationPriority;
    };
  };
  schedule?: {
    quietHours?: {
      start: string; // HH:mm format
      end: string;   // HH:mm format
    };
    timezone?: string;
    daysOfWeek?: number[]; // 0-6, where 0 is Sunday
  };
  frequency?: {
    [key in NotificationType]?: {
      immediate?: boolean;
      digest?: 'hourly' | 'daily' | 'weekly';
      maxPerDay?: number;
    };
  };
}

export interface NotificationEvent {
  id: string;
  userId: string;
  farmId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  status: NotificationStatus;
  templateId?: string;
  templateData?: Record<string, any>;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  retryCount?: number;
  maxRetries?: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerId?: string; // External provider message ID
  recipientId: string; // Email, phone, device token, etc.
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
  cost?: number;
  metadata?: Record<string, any>;
}

export interface WebhookNotification {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  payload: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  lastAttemptAt?: Date;
  status: 'pending' | 'delivered' | 'failed' | 'cancelled';
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
}

export interface NotificationDigest {
  id: string;
  userId: string;
  type: 'hourly' | 'daily' | 'weekly';
  period: {
    start: Date;
    end: Date;
  };
  notifications: NotificationEvent[];
  status: 'pending' | 'sent' | 'failed';
  sentAt?: Date;
  channels: NotificationChannel[];
}

export interface NotificationAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
  byChannel: {
    [key in NotificationChannel]?: {
      sent: number;
      delivered: number;
      failed: number;
      deliveryRate: number;
      openRate?: number;
      clickRate?: number;
    };
  };
  byType: {
    [key in NotificationType]?: {
      sent: number;
      delivered: number;
      failed: number;
      engagement: number;
    };
  };
  costs: {
    total: number;
    byChannel: {
      [key in NotificationChannel]?: number;
    };
  };
}

// Validation schemas (for use with express-validator)
export const NotificationChannelSchema = {
  in: [Object.values(NotificationChannel)],
  errorMessage: `Channel must be one of: ${Object.values(NotificationChannel).join(', ')}`
};

export const NotificationPrioritySchema = {
  in: [Object.values(NotificationPriority)],
  errorMessage: `Priority must be one of: ${Object.values(NotificationPriority).join(', ')}`
};

export const NotificationTypeSchema = {
  in: [Object.values(NotificationType)],
  errorMessage: `Type must be one of: ${Object.values(NotificationType).join(', ')}`
};

// Helper functions
export const isValidChannel = (channel: string): channel is NotificationChannel => {
  return Object.values(NotificationChannel).includes(channel as NotificationChannel);
};

export const isValidPriority = (priority: string): priority is NotificationPriority => {
  return Object.values(NotificationPriority).includes(priority as NotificationPriority);
};

export const isValidType = (type: string): type is NotificationType => {
  return Object.values(NotificationType).includes(type as NotificationType);
};

export const getDefaultPreferences = (): NotificationPreferences => ({
  userId: '',
  channels: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true,
    [NotificationChannel.SMS]: false,
    [NotificationChannel.WEBHOOK]: false
  },
  types: {
    [NotificationType.TRANSACTION_CREATED]: {
      enabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      priority: NotificationPriority.NORMAL
    },
    [NotificationType.BUDGET_EXCEEDED]: {
      enabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
      priority: NotificationPriority.HIGH
    },
    [NotificationType.WEATHER_ALERT]: {
      enabled: true,
      channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
      priority: NotificationPriority.URGENT
    },
    [NotificationType.SUBSIDY_DEADLINE]: {
      enabled: true,
      channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      priority: NotificationPriority.HIGH
    },
    [NotificationType.WELCOME]: {
      enabled: true,
      channels: [NotificationChannel.EMAIL],
      priority: NotificationPriority.NORMAL
    }
  },
  schedule: {
    quietHours: {
      start: '22:00',
      end: '07:00'
    },
    timezone: 'UTC'
  }
});