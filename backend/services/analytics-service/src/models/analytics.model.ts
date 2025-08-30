import { Schema, model, Document } from 'mongoose';

// Dashboard Metrics Schema
export interface IDashboardMetrics extends Document {
  userId: string;
  farmId?: string;
  metrics: {
    financial: {
      totalRevenue: number;
      totalExpenses: number;
      netProfit: number;
      revenueChange: number;
      expenseChange: number;
      profitChange: number;
    };
    production: {
      totalYield: number;
      totalArea: number;
      yieldPerHectare: number;
      yieldChange: number;
      areaChange: number;
      productivityChange: number;
    };
    users: {
      totalFarmers: number;
      activeFarmers: number;
      newFarmers: number;
      farmerChange: number;
      activeChange: number;
      newChange: number;
    };
    subsidies: {
      totalSubsidies: number;
      approvedSubsidies: number;
      pendingSubsidies: number;
      subsidyChange: number;
      approvedChange: number;
      pendingChange: number;
    };
    insurance: {
      totalClaims: number;
      approvedClaims: number;
      claimAmount: number;
      claimChange: number;
      approvedChange: number;
      amountChange: number;
    };
  };
  period: {
    startDate: Date;
    endDate: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
  createdAt: Date;
  updatedAt: Date;
}

const DashboardMetricsSchema = new Schema<IDashboardMetrics>({
  userId: { type: String, required: true, index: true },
  farmId: { type: String, index: true },
  metrics: {
    financial: {
      totalRevenue: { type: Number, required: true, default: 0 },
      totalExpenses: { type: Number, required: true, default: 0 },
      netProfit: { type: Number, required: true, default: 0 },
      revenueChange: { type: Number, default: 0 },
      expenseChange: { type: Number, default: 0 },
      profitChange: { type: Number, default: 0 }
    },
    production: {
      totalYield: { type: Number, required: true, default: 0 },
      totalArea: { type: Number, required: true, default: 0 },
      yieldPerHectare: { type: Number, required: true, default: 0 },
      yieldChange: { type: Number, default: 0 },
      areaChange: { type: Number, default: 0 },
      productivityChange: { type: Number, default: 0 }
    },
    users: {
      totalFarmers: { type: Number, required: true, default: 0 },
      activeFarmers: { type: Number, required: true, default: 0 },
      newFarmers: { type: Number, required: true, default: 0 },
      farmerChange: { type: Number, default: 0 },
      activeChange: { type: Number, default: 0 },
      newChange: { type: Number, default: 0 }
    },
    subsidies: {
      totalSubsidies: { type: Number, default: 0 },
      approvedSubsidies: { type: Number, default: 0 },
      pendingSubsidies: { type: Number, default: 0 },
      subsidyChange: { type: Number, default: 0 },
      approvedChange: { type: Number, default: 0 },
      pendingChange: { type: Number, default: 0 }
    },
    insurance: {
      totalClaims: { type: Number, default: 0 },
      approvedClaims: { type: Number, default: 0 },
      claimAmount: { type: Number, default: 0 },
      claimChange: { type: Number, default: 0 },
      approvedChange: { type: Number, default: 0 },
      amountChange: { type: Number, default: 0 }
    }
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'yearly'], 
      required: true 
    }
  }
}, {
  timestamps: true,
  collection: 'dashboard_metrics'
});

// Indexes for performance
DashboardMetricsSchema.index({ userId: 1, 'period.startDate': -1 });
DashboardMetricsSchema.index({ farmId: 1, 'period.startDate': -1 });
DashboardMetricsSchema.index({ 'period.type': 1, 'period.startDate': -1 });

// KPIs Schema
export interface IKPI extends Document {
  userId: string;
  farmId?: string;
  kpiType: 'financial' | 'production' | 'environmental' | 'operational';
  name: string;
  value: number;
  unit: string;
  target?: number;
  achievement?: number;
  trend: 'up' | 'down' | 'stable';
  period: {
    startDate: Date;
    endDate: Date;
    type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const KPISchema = new Schema<IKPI>({
  userId: { type: String, required: true, index: true },
  farmId: { type: String, index: true },
  kpiType: { 
    type: String, 
    enum: ['financial', 'production', 'environmental', 'operational'], 
    required: true 
  },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  target: { type: Number },
  achievement: { type: Number },
  trend: { 
    type: String, 
    enum: ['up', 'down', 'stable'], 
    required: true 
  },
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'yearly'], 
      required: true 
    }
  },
  metadata: { type: Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'kpis'
});

// Indexes for KPIs
KPISchema.index({ userId: 1, kpiType: 1, 'period.startDate': -1 });
KPISchema.index({ farmId: 1, kpiType: 1, 'period.startDate': -1 });

export const DashboardMetrics = model<IDashboardMetrics>('DashboardMetrics', DashboardMetricsSchema);
export const KPI = model<IKPI>('KPI', KPISchema);