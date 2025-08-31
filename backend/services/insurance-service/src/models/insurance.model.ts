import mongoose, { Document, Schema } from 'mongoose';

// Enums
export enum PolicyType {
  CROP_INSURANCE = 'crop_insurance',
  LIVESTOCK_INSURANCE = 'livestock_insurance',
  EQUIPMENT_INSURANCE = 'equipment_insurance',
  LIABILITY_INSURANCE = 'liability_insurance',
  WEATHER_INSURANCE = 'weather_insurance',
  REVENUE_INSURANCE = 'revenue_insurance',
  MULTI_PERIL_CROP = 'multi_peril_crop',
  HAIL_INSURANCE = 'hail_insurance'
}

export enum PolicyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

export enum ClaimStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PAID = 'paid',
  CLOSED = 'closed'
}

export enum CoverageType {
  NAMED_PERILS = 'named_perils',
  ALL_RISKS = 'all_risks',
  ACTUAL_PRODUCTION_HISTORY = 'aph',
  REVENUE_PROTECTION = 'rp',
  YIELD_PROTECTION = 'yp'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

// Interfaces
export interface ICoverage {
  type: CoverageType;
  description: string;
  limit: number;
  deductible: number;
  premium: number;
  perils: string[];
}

export interface IPolicyDocument extends Document {
  policyNumber: string;
  userId: string;
  farmId: string;
  providerId: string;
  type: PolicyType;
  status: PolicyStatus;
  coverages: ICoverage[];
  totalPremium: number;
  totalCoverage: number;
  deductible: number;
  effectiveDate: Date;
  expirationDate: Date;
  paymentSchedule: {
    frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    amount: number;
    nextPaymentDate: Date;
  };
  renewalTerms: {
    autoRenew: boolean;
    noticePeriod: number; // days
    rateIncreaseCap?: number;
  };
  underwritingInfo: {
    riskLevel: RiskLevel;
    factors: Array<{
      factor: string;
      weight: number;
      value: any;
    }>;
    inspectionRequired: boolean;
    lastInspection?: Date;
  };
  documents: Array<{
    type: string;
    name: string;
    url: string;
    uploadedAt: Date;
  }>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClaimDocument extends Document {
  claimNumber: string;
  policyId: string;
  userId: string;
  farmId: string;
  type: PolicyType;
  status: ClaimStatus;
  incidentDate: Date;
  reportedDate: Date;
  description: string;
  estimatedLoss: number;
  approvedAmount?: number;
  paidAmount?: number;
  adjusterId?: string;
  adjuster?: {
    name: string;
    contact: string;
    company: string;
  };
  investigationNotes: Array<{
    date: Date;
    author: string;
    note: string;
    type: 'internal' | 'external' | 'customer';
  }>;
  evidence: Array<{
    type: 'photo' | 'document' | 'video' | 'report';
    name: string;
    url: string;
    description?: string;
    uploadedAt: Date;
    uploadedBy: string;
  }>;
  timeline: Array<{
    date: Date;
    event: string;
    description: string;
    actor: string;
  }>;
  settlement: {
    method?: 'repair' | 'replacement' | 'cash';
    amount?: number;
    details?: string;
    paidDate?: Date;
    checkNumber?: string;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInsuranceProvider extends Document {
  name: string;
  code: string;
  type: 'government' | 'private' | 'mutual' | 'cooperative';
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
  ratings: {
    amBest?: string;
    moodys?: string;
    sp?: string;
    financial_strength: number;
  };
  licenseInfo: {
    licenseNumber: string;
    states: string[];
    expirationDate: Date;
  };
  productOfferings: PolicyType[];
  coverageAreas: string[];
  specializations: string[];
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRiskAssessment extends Document {
  userId: string;
  farmId: string;
  assessmentDate: Date;
  assessorId: string;
  riskFactors: Array<{
    category: string;
    factor: string;
    level: RiskLevel;
    score: number;
    description: string;
    mitigation?: string;
  }>;
  overallRisk: {
    level: RiskLevel;
    score: number;
    factors: string[];
  };
  recommendations: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    description: string;
    estimatedCost?: number;
    expectedBenefit?: string;
  }>;
  weatherRisk: {
    droughtRisk: number;
    floodRisk: number;
    hailRisk: number;
    windRisk: number;
    frostRisk: number;
  };
  cropRisk: {
    diseaseRisk: number;
    pestRisk: number;
    yieldVariability: number;
    marketVolatility: number;
  };
  equipmentRisk: {
    age: number;
    condition: string;
    replacementCost: number;
    maintenanceHistory: string;
  };
  validUntil: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schemas
const CoverageSchema = new Schema<ICoverage>({
  type: { type: String, enum: Object.values(CoverageType), required: true },
  description: { type: String, required: true },
  limit: { type: Number, required: true },
  deductible: { type: Number, required: true },
  premium: { type: Number, required: true },
  perils: [{ type: String }]
});

const PolicySchema = new Schema<IPolicyDocument>({
  policyNumber: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  providerId: { type: String, required: true },
  type: { type: String, enum: Object.values(PolicyType), required: true },
  status: { type: String, enum: Object.values(PolicyStatus), default: PolicyStatus.PENDING },
  coverages: [CoverageSchema],
  totalPremium: { type: Number, required: true },
  totalCoverage: { type: Number, required: true },
  deductible: { type: Number, required: true },
  effectiveDate: { type: Date, required: true },
  expirationDate: { type: Date, required: true },
  paymentSchedule: {
    frequency: { type: String, enum: ['monthly', 'quarterly', 'semi_annual', 'annual'], required: true },
    amount: { type: Number, required: true },
    nextPaymentDate: { type: Date, required: true }
  },
  renewalTerms: {
    autoRenew: { type: Boolean, default: false },
    noticePeriod: { type: Number, default: 30 },
    rateIncreaseCap: { type: Number }
  },
  underwritingInfo: {
    riskLevel: { type: String, enum: Object.values(RiskLevel), required: true },
    factors: [{
      factor: String,
      weight: Number,
      value: Schema.Types.Mixed
    }],
    inspectionRequired: { type: Boolean, default: false },
    lastInspection: { type: Date }
  },
  documents: [{
    type: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, farmId: 1 },
    { providerId: 1 },
    { status: 1 },
    { type: 1 },
    { expirationDate: 1 }
  ]
});

const ClaimSchema = new Schema<IClaimDocument>({
  claimNumber: { type: String, required: true, unique: true },
  policyId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(PolicyType), required: true },
  status: { type: String, enum: Object.values(ClaimStatus), default: ClaimStatus.PENDING },
  incidentDate: { type: Date, required: true },
  reportedDate: { type: Date, default: Date.now },
  description: { type: String, required: true },
  estimatedLoss: { type: Number, required: true },
  approvedAmount: { type: Number },
  paidAmount: { type: Number, default: 0 },
  adjusterId: { type: String },
  adjuster: {
    name: String,
    contact: String,
    company: String
  },
  investigationNotes: [{
    date: { type: Date, default: Date.now },
    author: { type: String, required: true },
    note: { type: String, required: true },
    type: { type: String, enum: ['internal', 'external', 'customer'], default: 'internal' }
  }],
  evidence: [{
    type: { type: String, enum: ['photo', 'document', 'video', 'report'], required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    description: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true }
  }],
  timeline: [{
    date: { type: Date, default: Date.now },
    event: { type: String, required: true },
    description: { type: String, required: true },
    actor: { type: String, required: true }
  }],
  settlement: {
    method: { type: String, enum: ['repair', 'replacement', 'cash'] },
    amount: Number,
    details: String,
    paidDate: Date,
    checkNumber: String
  },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, farmId: 1 },
    { policyId: 1 },
    { status: 1 },
    { incidentDate: 1 }
  ]
});

const InsuranceProviderSchema = new Schema<IInsuranceProvider>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['government', 'private', 'mutual', 'cooperative'], required: true },
  contactInfo: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: String,
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, default: 'US' }
    }
  },
  ratings: {
    amBest: String,
    moodys: String,
    sp: String,
    financial_strength: { type: Number, min: 1, max: 10 }
  },
  licenseInfo: {
    licenseNumber: { type: String, required: true },
    states: [{ type: String }],
    expirationDate: { type: Date, required: true }
  },
  productOfferings: [{ type: String, enum: Object.values(PolicyType) }],
  coverageAreas: [{ type: String }],
  specializations: [{ type: String }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { code: 1 },
    { type: 1 },
    { isActive: 1 },
    { 'productOfferings': 1 }
  ]
});

const RiskAssessmentSchema = new Schema<IRiskAssessment>({
  userId: { type: String, required: true, index: true },
  farmId: { type: String, required: true, index: true },
  assessmentDate: { type: Date, default: Date.now },
  assessorId: { type: String, required: true },
  riskFactors: [{
    category: { type: String, required: true },
    factor: { type: String, required: true },
    level: { type: String, enum: Object.values(RiskLevel), required: true },
    score: { type: Number, required: true },
    description: { type: String, required: true },
    mitigation: String
  }],
  overallRisk: {
    level: { type: String, enum: Object.values(RiskLevel), required: true },
    score: { type: Number, required: true },
    factors: [String]
  },
  recommendations: [{
    type: { type: String, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
    description: { type: String, required: true },
    estimatedCost: Number,
    expectedBenefit: String
  }],
  weatherRisk: {
    droughtRisk: { type: Number, default: 0 },
    floodRisk: { type: Number, default: 0 },
    hailRisk: { type: Number, default: 0 },
    windRisk: { type: Number, default: 0 },
    frostRisk: { type: Number, default: 0 }
  },
  cropRisk: {
    diseaseRisk: { type: Number, default: 0 },
    pestRisk: { type: Number, default: 0 },
    yieldVariability: { type: Number, default: 0 },
    marketVolatility: { type: Number, default: 0 }
  },
  equipmentRisk: {
    age: { type: Number, default: 0 },
    condition: { type: String, default: 'good' },
    replacementCost: { type: Number, default: 0 },
    maintenanceHistory: { type: String, default: 'regular' }
  },
  validUntil: { type: Date, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, farmId: 1 },
    { assessmentDate: 1 },
    { validUntil: 1 }
  ]
});

// Add indexes for performance
PolicySchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });
ClaimSchema.index({ incidentDate: -1 });
RiskAssessmentSchema.index({ validUntil: 1 }, { expireAfterSeconds: 0 });

// Virtual fields
PolicySchema.virtual('isExpired').get(function() {
  return new Date() > this.expirationDate;
});

PolicySchema.virtual('daysUntilExpiration').get(function() {
  const now = new Date();
  const expiry = this.expirationDate;
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

ClaimSchema.virtual('daysSinceIncident').get(function() {
  const now = new Date();
  const incident = this.incidentDate;
  return Math.floor((now.getTime() - incident.getTime()) / (1000 * 60 * 60 * 24));
});

// Models
export const Policy = mongoose.model<IPolicyDocument>('Policy', PolicySchema);
export const Claim = mongoose.model<IClaimDocument>('Claim', ClaimSchema);
export const InsuranceProvider = mongoose.model<IInsuranceProvider>('InsuranceProvider', InsuranceProviderSchema);
export const RiskAssessment = mongoose.model<IRiskAssessment>('RiskAssessment', RiskAssessmentSchema);

// Helper types for API responses
export interface PolicySummary {
  id: string;
  policyNumber: string;
  type: PolicyType;
  status: PolicyStatus;
  totalCoverage: number;
  totalPremium: number;
  expirationDate: Date;
  isExpired: boolean;
  daysUntilExpiration: number;
}

export interface ClaimSummary {
  id: string;
  claimNumber: string;
  type: PolicyType;
  status: ClaimStatus;
  estimatedLoss: number;
  approvedAmount?: number;
  incidentDate: Date;
  daysSinceIncident: number;
}

// Validation helpers
export const validatePolicyType = (type: string): type is PolicyType => {
  return Object.values(PolicyType).includes(type as PolicyType);
};

export const validateClaimStatus = (status: string): status is ClaimStatus => {
  return Object.values(ClaimStatus).includes(status as ClaimStatus);
};

export const validateRiskLevel = (level: string): level is RiskLevel => {
  return Object.values(RiskLevel).includes(level as RiskLevel);
};