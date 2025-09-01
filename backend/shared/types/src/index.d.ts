export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface ApiResponse<T = any> {
    data: T;
    meta: {
        requestId: string;
        timestamp: string;
        pagination?: PaginationMeta;
    };
    links?: {
        self: string;
        next?: string;
        prev?: string;
    };
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
}
export declare enum UserRole {
    FARMER = "farmer",
    ADVISOR = "advisor",
    ADMIN = "admin",
    SUPPORT = "support"
}
export interface User extends BaseEntity {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role: UserRole;
    isActive: boolean;
    emailVerifiedAt?: Date;
    profile?: UserProfile;
}
export interface UserProfile {
    avatar?: string;
    bio?: string;
    location?: string;
    farmIds: string[];
    preferences: UserPreferences;
}
export interface UserPreferences {
    currency: string;
    language: string;
    timezone: string;
    notifications: NotificationPreferences;
}
export interface NotificationPreferences {
    email: boolean;
    sms: boolean;
    push: boolean;
    categories: {
        financial: boolean;
        subsidies: boolean;
        insurance: boolean;
        weather: boolean;
        system: boolean;
    };
}
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
}
export interface Farm extends BaseEntity {
    name: string;
    description?: string;
    ownerId: string;
    location: FarmLocation;
    totalAcres: number;
    farmType: FarmType;
    certifications: string[];
    isActive: boolean;
}
export interface FarmLocation {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: {
        latitude: number;
        longitude: number;
    };
}
export declare enum FarmType {
    CROP = "crop",
    LIVESTOCK = "livestock",
    MIXED = "mixed",
    DAIRY = "dairy",
    POULTRY = "poultry",
    AQUACULTURE = "aquaculture"
}
export declare enum TransactionType {
    INCOME = "income",
    EXPENSE = "expense"
}
export declare enum PaymentMethod {
    CASH = "cash",
    CHECK = "check",
    BANK_TRANSFER = "bank_transfer",
    CREDIT_CARD = "credit_card",
    DIGITAL_PAYMENT = "digital_payment"
}
export interface TransactionCategory extends BaseEntity {
    name: string;
    description?: string;
    categoryType: TransactionType;
    parentCategoryId?: string;
    isActive: boolean;
    color?: string;
    icon?: string;
}
export interface FinancialTransaction extends BaseEntity {
    farmId: string;
    categoryId: string;
    amount: number;
    transactionType: TransactionType;
    description: string;
    transactionDate: Date;
    receiptUrl?: string;
    cropId?: string;
    seasonYear: number;
    paymentMethod?: PaymentMethod;
    vendorName?: string;
    referenceNumber?: string;
    tags: string[];
    createdBy: string;
}
export interface Budget extends BaseEntity {
    farmId: string;
    name: string;
    description?: string;
    seasonYear: number;
    totalBudget: number;
    categories: BudgetCategory[];
    status: BudgetStatus;
    createdBy: string;
}
export interface BudgetCategory {
    categoryId: string;
    allocatedAmount: number;
    spentAmount: number;
    remainingAmount: number;
}
export declare enum BudgetStatus {
    DRAFT = "draft",
    ACTIVE = "active",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export interface SubsidyProgram {
    _id: string;
    name: string;
    description: string;
    programType: 'federal' | 'state' | 'local';
    eligibilityCriteria: EligibilityCriteria;
    benefits: SubsidyBenefit;
    applicationPeriod: ApplicationPeriod;
    requiredDocuments: string[];
    contactInfo: ContactInfo;
    isActive: boolean;
    lastUpdated: Date;
}
export interface EligibilityCriteria {
    farmSize?: {
        min: number;
        max: number;
    };
    cropTypes?: string[];
    income?: {
        max: number;
    };
    location?: string[];
    certifications?: string[];
}
export interface SubsidyBenefit {
    type: 'direct_payment' | 'cost_share' | 'loan_guarantee' | 'insurance_premium';
    amount?: number;
    percentage?: number;
    maxAmount?: number;
}
export interface ApplicationPeriod {
    startDate: Date;
    endDate: Date;
    deadlines: Date[];
}
export interface ContactInfo {
    agency: string;
    phone: string;
    email: string;
    website: string;
}
export interface SubsidyApplication {
    _id: string;
    farmId: string;
    userId: string;
    programId: string;
    applicationData: Record<string, any>;
    documents: ApplicationDocument[];
    status: ApplicationStatus;
    timeline: ApplicationTimeline[];
    approvedAmount?: number;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface ApplicationDocument {
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
    verified: boolean;
}
export declare enum ApplicationStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    DENIED = "denied",
    PENDING_DOCUMENTS = "pending_documents"
}
export interface ApplicationTimeline {
    stage: string;
    date: Date;
    notes?: string;
}
export interface InsuranceProvider {
    id: string;
    name: string;
    description: string;
    website: string;
    contactInfo: ContactInfo;
    coverageTypes: string[];
    isActive: boolean;
}
export interface InsurancePolicy {
    id: string;
    providerId: string;
    name: string;
    description: string;
    coverageType: string;
    premiumBase: number;
    deductible: number;
    maxCoverage: number;
    terms: string[];
    exclusions: string[];
}
export interface InsuranceQuote {
    id: string;
    farmId: string;
    userId: string;
    providerId: string;
    policyId: string;
    coverageAmount: number;
    premium: number;
    deductible: number;
    quoteData: Record<string, any>;
    validUntil: Date;
    status: QuoteStatus;
    createdAt: Date;
}
export declare enum QuoteStatus {
    PENDING = "pending",
    ACTIVE = "active",
    EXPIRED = "expired",
    ACCEPTED = "accepted",
    DECLINED = "declined"
}
export interface InsuranceClaim {
    id: string;
    farmId: string;
    userId: string;
    policyId: string;
    claimAmount: number;
    description: string;
    incidentDate: Date;
    claimDate: Date;
    status: ClaimStatus;
    documents: ApplicationDocument[];
    timeline: ApplicationTimeline[];
}
export declare enum ClaimStatus {
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    DENIED = "denied",
    PAID = "paid"
}
export interface FinancialAnalytics {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    revenueGrowth: number;
    expenseGrowth: number;
    cashFlow: number;
    budgetVariance: number;
}
export interface CropAnalytics {
    cropId: string;
    cropName: string;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitPerAcre: number;
    yieldPerAcre: number;
    profitability: number;
}
export interface MarketData {
    commodity: string;
    price: number;
    unit: string;
    exchange: string;
    timestamp: Date;
    change: number;
    changePercent: number;
}
export interface IoTDevice {
    deviceId: string;
    farmId: string;
    deviceType: string;
    name: string;
    location: {
        latitude: number;
        longitude: number;
    };
    isActive: boolean;
    lastSeen: Date;
    metadata: Record<string, any>;
}
export interface SensorReading {
    deviceId: string;
    timestamp: Date;
    sensorType: string;
    value: number;
    unit: string;
    quality: number;
}
export interface IoTMessage {
    deviceId: string;
    timestamp: number;
    messageType: 'sensor_data' | 'status' | 'alarm';
    payload: Record<string, any>;
    metadata?: {
        batteryLevel?: number;
        signalStrength?: number;
        firmwareVersion?: string;
    };
}
export interface Document {
    id: string;
    farmId: string;
    userId: string;
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    documentType: string;
    description?: string;
    tags: string[];
    extractedData?: Record<string, any>;
    ocrText?: string;
    uploadedAt: Date;
    processedAt?: Date;
}
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    data?: Record<string, any>;
    isRead: boolean;
    createdAt: Date;
    readAt?: Date;
}
export declare enum NotificationType {
    SYSTEM = "system",
    FINANCIAL = "financial",
    SUBSIDY = "subsidy",
    INSURANCE = "insurance",
    WEATHER = "weather",
    IOT = "iot"
}
export declare enum NotificationPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare enum NotificationChannel {
    EMAIL = "email",
    SMS = "sms",
    PUSH = "push",
    IN_APP = "in_app"
}
export interface BaseEvent {
    id: string;
    type: string;
    aggregateId: string;
    aggregateType: string;
    version: number;
    timestamp: Date;
    userId?: string;
    metadata?: Record<string, any>;
}
export interface UserCreatedEvent extends BaseEvent {
    type: 'user.created';
    aggregateType: 'user';
    data: {
        userId: string;
        email: string;
        role: UserRole;
    };
}
export interface TransactionCreatedEvent extends BaseEvent {
    type: 'transaction.created';
    aggregateType: 'transaction';
    data: {
        transactionId: string;
        farmId: string;
        amount: number;
        type: TransactionType;
    };
}
export interface SubsidyApplicationSubmittedEvent extends BaseEvent {
    type: 'subsidy.application.submitted';
    aggregateType: 'application';
    data: {
        applicationId: string;
        farmId: string;
        programId: string;
        userId: string;
    };
}
export interface HealthStatus {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    timestamp: string;
    responseTime?: number;
}
export interface HealthCheck {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    version: string;
    checks: {
        database: HealthStatus;
        redis: HealthStatus;
        externalApis: HealthStatus;
        messageQueue?: HealthStatus;
    };
}
export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    pool: {
        min: number;
        max: number;
        idle: number;
        acquire: number;
    };
}
export interface RedisConfig {
    url: string;
    password?: string;
    ttl: number;
    maxRetries: number;
}
export interface KafkaConfig {
    brokers: string[];
    groupId: string;
    clientId: string;
    topics: Record<string, string>;
}
export interface JWTConfig {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
}
export interface ServiceConfig {
    name: string;
    version: string;
    port: number;
    environment: string;
    database: DatabaseConfig;
    redis: RedisConfig;
    kafka?: KafkaConfig;
    jwt: JWTConfig;
    logging: {
        level: string;
        format: string;
    };
}
//# sourceMappingURL=index.d.ts.map