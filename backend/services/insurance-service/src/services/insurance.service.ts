import { logger } from '@daorsagro/utils';
import { 
  Policy, 
  Claim, 
  InsuranceProvider, 
  RiskAssessment,
  IPolicyDocument,
  IClaimDocument,
  IInsuranceProvider,
  IRiskAssessment,
  PolicyType,
  PolicyStatus,
  ClaimStatus,
  RiskLevel,
  PolicySummary,
  ClaimSummary
} from '../models/insurance.model';

interface PolicySearchParams {
  userId?: string;
  farmId?: string;
  type?: PolicyType;
  status?: PolicyStatus;
  providerId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ClaimSearchParams {
  userId?: string;
  farmId?: string;
  policyId?: string;
  type?: PolicyType;
  status?: ClaimStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
}

interface PolicyQuoteRequest {
  userId: string;
  farmId: string;
  type: PolicyType;
  coverageAmount: number;
  deductible: number;
  farmDetails: {
    acreage: number;
    location: {
      state: string;
      county: string;
      zipCode: string;
    };
    cropTypes: string[];
    equipmentValue?: number;
    livestockCount?: number;
  };
  riskFactors?: Record<string, any>;
}

interface PolicyQuote {
  quoteId: string;
  providerId: string;
  providerName: string;
  policyType: PolicyType;
  premium: {
    annual: number;
    monthly: number;
    quarterly: number;
  };
  coverage: {
    total: number;
    deductible: number;
    perils: string[];
  };
  terms: {
    effectiveDate: Date;
    expirationDate: Date;
    paymentOptions: string[];
  };
  discounts: Array<{
    type: string;
    description: string;
    amount: number;
    percentage: number;
  }>;
  validUntil: Date;
  metadata: Record<string, any>;
}

export class InsuranceService {
  /**
   * Get policies for a user or farm
   */
  async getPolicies(params: PolicySearchParams): Promise<{
    policies: PolicySummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', ...filters } = params;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};
      if (filters.userId) query.userId = filters.userId;
      if (filters.farmId) query.farmId = filters.farmId;
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.providerId) query.providerId = filters.providerId;

      // Execute query
      const [policies, total] = await Promise.all([
        Policy.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Policy.countDocuments(query)
      ]);

      // Transform to summary format
      const policySummaries: PolicySummary[] = policies.map(policy => ({
        id: policy._id.toString(),
        policyNumber: policy.policyNumber,
        type: policy.type,
        status: policy.status,
        totalCoverage: policy.totalCoverage,
        totalPremium: policy.totalPremium,
        expirationDate: policy.expirationDate,
        isExpired: new Date() > policy.expirationDate,
        daysUntilExpiration: Math.ceil((policy.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }));

      return {
        policies: policySummaries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching policies:', error);
      throw error;
    }
  }

  /**
   * Get a specific policy by ID
   */
  async getPolicyById(policyId: string, userId: string): Promise<IPolicyDocument | null> {
    try {
      const policy = await Policy.findOne({ 
        _id: policyId, 
        userId 
      }).lean();

      return policy;
    } catch (error) {
      logger.error('Error fetching policy:', error);
      throw error;
    }
  }

  /**
   * Create a new policy
   */
  async createPolicy(policyData: Partial<IPolicyDocument>): Promise<IPolicyDocument> {
    try {
      // Generate policy number
      const policyNumber = await this.generatePolicyNumber(policyData.type!, policyData.providerId!);
      
      const policy = new Policy({
        ...policyData,
        policyNumber,
        status: PolicyStatus.PENDING
      });

      await policy.save();

      logger.info('Policy created successfully', {
        policyId: policy._id,
        policyNumber: policy.policyNumber,
        userId: policy.userId
      });

      return policy;
    } catch (error) {
      logger.error('Error creating policy:', error);
      throw error;
    }
  }

  /**
   * Update policy status
   */
  async updatePolicyStatus(policyId: string, status: PolicyStatus, userId: string): Promise<IPolicyDocument | null> {
    try {
      const policy = await Policy.findOneAndUpdate(
        { _id: policyId, userId },
        { status, updatedAt: new Date() },
        { new: true }
      );

      if (policy) {
        logger.info('Policy status updated', {
          policyId: policy._id,
          policyNumber: policy.policyNumber,
          newStatus: status
        });
      }

      return policy;
    } catch (error) {
      logger.error('Error updating policy status:', error);
      throw error;
    }
  }

  /**
   * Get policy quotes from multiple providers
   */
  async getQuotes(quoteRequest: PolicyQuoteRequest): Promise<PolicyQuote[]> {
    try {
      logger.info('Generating policy quotes', {
        userId: quoteRequest.userId,
        type: quoteRequest.type,
        coverageAmount: quoteRequest.coverageAmount
      });

      // Get available providers for this policy type
      const providers = await InsuranceProvider.find({
        productOfferings: quoteRequest.type,
        isActive: true,
        coverageAreas: { $in: [quoteRequest.farmDetails.location.state] }
      });

      // Generate quotes from each provider
      const quotes: PolicyQuote[] = [];
      
      for (const provider of providers) {
        const quote = await this.generateQuote(provider, quoteRequest);
        if (quote) {
          quotes.push(quote);
        }
      }

      // Sort by premium (lowest first)
      quotes.sort((a, b) => a.premium.annual - b.premium.annual);

      logger.info('Quotes generated successfully', {
        userId: quoteRequest.userId,
        quotesCount: quotes.length
      });

      return quotes;
    } catch (error) {
      logger.error('Error generating quotes:', error);
      throw error;
    }
  }

  /**
   * Get claims for a user or farm
   */
  async getClaims(params: ClaimSearchParams): Promise<{
    claims: ClaimSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 20, sortBy = 'incidentDate', sortOrder = 'desc', ...filters } = params;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};
      if (filters.userId) query.userId = filters.userId;
      if (filters.farmId) query.farmId = filters.farmId;
      if (filters.policyId) query.policyId = filters.policyId;
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        query.incidentDate = {};
        if (filters.dateFrom) query.incidentDate.$gte = filters.dateFrom;
        if (filters.dateTo) query.incidentDate.$lte = filters.dateTo;
      }

      // Execute query
      const [claims, total] = await Promise.all([
        Claim.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Claim.countDocuments(query)
      ]);

      // Transform to summary format
      const claimSummaries: ClaimSummary[] = claims.map(claim => ({
        id: claim._id.toString(),
        claimNumber: claim.claimNumber,
        type: claim.type,
        status: claim.status,
        estimatedLoss: claim.estimatedLoss,
        approvedAmount: claim.approvedAmount,
        incidentDate: claim.incidentDate,
        daysSinceIncident: Math.floor((new Date().getTime() - claim.incidentDate.getTime()) / (1000 * 60 * 60 * 24))
      }));

      return {
        claims: claimSummaries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('Error fetching claims:', error);
      throw error;
    }
  }

  /**
   * Get a specific claim by ID
   */
  async getClaimById(claimId: string, userId: string): Promise<IClaimDocument | null> {
    try {
      const claim = await Claim.findOne({ 
        _id: claimId, 
        userId 
      }).lean();

      return claim;
    } catch (error) {
      logger.error('Error fetching claim:', error);
      throw error;
    }
  }

  /**
   * Create a new claim
   */
  async createClaim(claimData: Partial<IClaimDocument>): Promise<IClaimDocument> {
    try {
      // Verify policy exists and is active
      const policy = await Policy.findOne({
        _id: claimData.policyId,
        userId: claimData.userId,
        status: PolicyStatus.ACTIVE
      });

      if (!policy) {
        throw new Error('Policy not found or not active');
      }

      // Generate claim number
      const claimNumber = await this.generateClaimNumber(policy.type);
      
      const claim = new Claim({
        ...claimData,
        claimNumber,
        type: policy.type,
        status: ClaimStatus.PENDING,
        timeline: [{
          date: new Date(),
          event: 'Claim submitted',
          description: 'Initial claim submission',
          actor: 'system'
        }]
      });

      await claim.save();

      logger.info('Claim created successfully', {
        claimId: claim._id,
        claimNumber: claim.claimNumber,
        policyId: claim.policyId,
        userId: claim.userId
      });

      return claim;
    } catch (error) {
      logger.error('Error creating claim:', error);
      throw error;
    }
  }

  /**
   * Update claim status
   */
  async updateClaimStatus(
    claimId: string, 
    status: ClaimStatus, 
    userId: string,
    note?: string,
    approvedAmount?: number
  ): Promise<IClaimDocument | null> {
    try {
      const updateData: any = { 
        status, 
        updatedAt: new Date() 
      };

      if (approvedAmount !== undefined) {
        updateData.approvedAmount = approvedAmount;
      }

      const claim = await Claim.findOneAndUpdate(
        { _id: claimId, userId },
        { 
          $set: updateData,
          $push: {
            timeline: {
              date: new Date(),
              event: `Status changed to ${status}`,
              description: note || `Claim status updated to ${status}`,
              actor: 'system'
            }
          }
        },
        { new: true }
      );

      if (claim) {
        logger.info('Claim status updated', {
          claimId: claim._id,
          claimNumber: claim.claimNumber,
          newStatus: status,
          approvedAmount
        });
      }

      return claim;
    } catch (error) {
      logger.error('Error updating claim status:', error);
      throw error;
    }
  }

  /**
   * Add evidence to a claim
   */
  async addClaimEvidence(
    claimId: string,
    userId: string,
    evidence: {
      type: 'photo' | 'document' | 'video' | 'report';
      name: string;
      url: string;
      description?: string;
      uploadedBy: string;
    }
  ): Promise<IClaimDocument | null> {
    try {
      const claim = await Claim.findOneAndUpdate(
        { _id: claimId, userId },
        { 
          $push: { 
            evidence: {
              ...evidence,
              uploadedAt: new Date()
            },
            timeline: {
              date: new Date(),
              event: 'Evidence added',
              description: `Added ${evidence.type}: ${evidence.name}`,
              actor: evidence.uploadedBy
            }
          }
        },
        { new: true }
      );

      if (claim) {
        logger.info('Evidence added to claim', {
          claimId: claim._id,
          evidenceType: evidence.type,
          evidenceName: evidence.name
        });
      }

      return claim;
    } catch (error) {
      logger.error('Error adding claim evidence:', error);
      throw error;
    }
  }

  /**
   * Conduct risk assessment
   */
  async conductRiskAssessment(
    userId: string,
    farmId: string,
    assessmentData: Partial<IRiskAssessment>
  ): Promise<IRiskAssessment> {
    try {
      // Calculate overall risk score
      const riskFactors = assessmentData.riskFactors || [];
      const totalScore = riskFactors.reduce((sum, factor) => sum + factor.score, 0);
      const averageScore = riskFactors.length > 0 ? totalScore / riskFactors.length : 0;

      // Determine risk level
      let riskLevel: RiskLevel;
      if (averageScore >= 8) riskLevel = RiskLevel.VERY_HIGH;
      else if (averageScore >= 6) riskLevel = RiskLevel.HIGH;
      else if (averageScore >= 4) riskLevel = RiskLevel.MEDIUM;
      else riskLevel = RiskLevel.LOW;

      const assessment = new RiskAssessment({
        ...assessmentData,
        userId,
        farmId,
        overallRisk: {
          level: riskLevel,
          score: averageScore,
          factors: riskFactors.map(f => f.factor)
        },
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Valid for 1 year
      });

      await assessment.save();

      logger.info('Risk assessment completed', {
        assessmentId: assessment._id,
        userId,
        farmId,
        riskLevel,
        score: averageScore
      });

      return assessment;
    } catch (error) {
      logger.error('Error conducting risk assessment:', error);
      throw error;
    }
  }

  /**
   * Get insurance providers
   */
  async getProviders(filters: {
    type?: string;
    state?: string;
    policyType?: PolicyType;
    isActive?: boolean;
  } = {}): Promise<IInsuranceProvider[]> {
    try {
      const query: any = {};
      
      if (filters.type) query.type = filters.type;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;
      if (filters.state) query.coverageAreas = { $in: [filters.state] };
      if (filters.policyType) query.productOfferings = { $in: [filters.policyType] };

      const providers = await InsuranceProvider.find(query)
        .sort({ name: 1 })
        .lean();

      return providers;
    } catch (error) {
      logger.error('Error fetching providers:', error);
      throw error;
    }
  }

  /**
   * Get policy analytics
   */
  async getPolicyAnalytics(userId: string, farmId?: string): Promise<{
    totalPolicies: number;
    activePolicies: number;
    totalCoverage: number;
    totalPremiums: number;
    expiringSoon: number;
    byType: Record<PolicyType, number>;
    byStatus: Record<PolicyStatus, number>;
  }> {
    try {
      const query: any = { userId };
      if (farmId) query.farmId = farmId;

      const policies = await Policy.find(query).lean();
      
      const analytics = {
        totalPolicies: policies.length,
        activePolicies: policies.filter(p => p.status === PolicyStatus.ACTIVE).length,
        totalCoverage: policies.reduce((sum, p) => sum + p.totalCoverage, 0),
        totalPremiums: policies.reduce((sum, p) => sum + p.totalPremium, 0),
        expiringSoon: policies.filter(p => {
          const daysUntilExpiry = Math.ceil((p.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length,
        byType: {} as Record<PolicyType, number>,
        byStatus: {} as Record<PolicyStatus, number>
      };

      // Count by type
      policies.forEach(policy => {
        analytics.byType[policy.type] = (analytics.byType[policy.type] || 0) + 1;
        analytics.byStatus[policy.status] = (analytics.byStatus[policy.status] || 0) + 1;
      });

      return analytics;
    } catch (error) {
      logger.error('Error generating policy analytics:', error);
      throw error;
    }
  }

  /**
   * Get claim analytics
   */
  async getClaimAnalytics(userId: string, farmId?: string): Promise<{
    totalClaims: number;
    pendingClaims: number;
    approvedClaims: number;
    totalEstimatedLoss: number;
    totalApprovedAmount: number;
    totalPaidAmount: number;
    averageProcessingTime: number;
    byStatus: Record<ClaimStatus, number>;
    byType: Record<PolicyType, number>;
  }> {
    try {
      const query: any = { userId };
      if (farmId) query.farmId = farmId;

      const claims = await Claim.find(query).lean();
      
      const analytics = {
        totalClaims: claims.length,
        pendingClaims: claims.filter(c => c.status === ClaimStatus.PENDING || c.status === ClaimStatus.UNDER_REVIEW).length,
        approvedClaims: claims.filter(c => c.status === ClaimStatus.APPROVED || c.status === ClaimStatus.PAID).length,
        totalEstimatedLoss: claims.reduce((sum, c) => sum + c.estimatedLoss, 0),
        totalApprovedAmount: claims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0),
        totalPaidAmount: claims.reduce((sum, c) => sum + (c.paidAmount || 0), 0),
        averageProcessingTime: 0, // Calculate processing time
        byStatus: {} as Record<ClaimStatus, number>,
        byType: {} as Record<PolicyType, number>
      };

      // Count by status and type
      claims.forEach(claim => {
        analytics.byStatus[claim.status] = (analytics.byStatus[claim.status] || 0) + 1;
        analytics.byType[claim.type] = (analytics.byType[claim.type] || 0) + 1;
      });

      // Calculate average processing time for closed claims
      const closedClaims = claims.filter(c => c.status === ClaimStatus.PAID || c.status === ClaimStatus.CLOSED);
      if (closedClaims.length > 0) {
        const totalProcessingTime = closedClaims.reduce((sum, c) => {
          return sum + (c.updatedAt.getTime() - c.reportedDate.getTime());
        }, 0);
        analytics.averageProcessingTime = totalProcessingTime / closedClaims.length / (1000 * 60 * 60 * 24); // Days
      }

      return analytics;
    } catch (error) {
      logger.error('Error generating claim analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async generatePolicyNumber(type: PolicyType, providerId: string): Promise<string> {
    const year = new Date().getFullYear();
    const typeCode = type.split('_')[0].toUpperCase().substring(0, 3);
    const providerCode = providerId.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    
    return `${typeCode}${providerCode}${year}${randomNum}`;
  }

  private async generateClaimNumber(type: PolicyType): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const typeCode = type.split('_')[0].toUpperCase().substring(0, 3);
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `CL${typeCode}${year}${month}${randomNum}`;
  }

  private async generateQuote(provider: IInsuranceProvider, request: PolicyQuoteRequest): Promise<PolicyQuote | null> {
    try {
      // Simulate quote generation based on provider and request
      const baseRate = this.getBaseRate(request.type, request.farmDetails);
      const riskMultiplier = this.calculateRiskMultiplier(request.riskFactors);
      const providerMultiplier = this.getProviderMultiplier(provider);
      
      const annualPremium = Math.round(baseRate * request.coverageAmount * riskMultiplier * providerMultiplier / 100);
      
      const quote: PolicyQuote = {
        quoteId: `Q${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
        providerId: provider._id.toString(),
        providerName: provider.name,
        policyType: request.type,
        premium: {
          annual: annualPremium,
          monthly: Math.round(annualPremium / 12),
          quarterly: Math.round(annualPremium / 4)
        },
        coverage: {
          total: request.coverageAmount,
          deductible: request.deductible,
          perils: this.getPerilsForType(request.type)
        },
        terms: {
          effectiveDate: new Date(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          paymentOptions: ['annual', 'semi_annual', 'quarterly', 'monthly']
        },
        discounts: this.calculateDiscounts(request, provider),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        metadata: {
          baseRate,
          riskMultiplier,
          providerMultiplier
        }
      };

      return quote;
    } catch (error) {
      logger.error('Error generating quote:', error);
      return null;
    }
  }

  private getBaseRate(type: PolicyType, farmDetails: any): number {
    const rates: Record<PolicyType, number> = {
      [PolicyType.CROP_INSURANCE]: 2.5,
      [PolicyType.LIVESTOCK_INSURANCE]: 3.0,
      [PolicyType.EQUIPMENT_INSURANCE]: 1.8,
      [PolicyType.LIABILITY_INSURANCE]: 1.2,
      [PolicyType.WEATHER_INSURANCE]: 4.0,
      [PolicyType.REVENUE_INSURANCE]: 3.5,
      [PolicyType.MULTI_PERIL_CROP]: 3.8,
      [PolicyType.HAIL_INSURANCE]: 2.2
    };

    return rates[type] || 2.0;
  }

  private calculateRiskMultiplier(riskFactors?: Record<string, any>): number {
    if (!riskFactors) return 1.0;
    
    // Simple risk calculation - in production this would be more sophisticated
    const baseMultiplier = 1.0;
    const riskAdjustment = Object.values(riskFactors).reduce((sum: number, value: any) => {
      if (typeof value === 'number') return sum + (value / 10);
      return sum;
    }, 0) / Object.keys(riskFactors).length;

    return Math.max(0.5, Math.min(2.0, baseMultiplier + riskAdjustment));
  }

  private getProviderMultiplier(provider: IInsuranceProvider): number {
    // Provider-specific pricing multiplier
    const baseMultiplier = 1.0;
    const ratingAdjustment = (provider.ratings?.financial_strength || 5) / 10;
    
    return baseMultiplier * (0.8 + ratingAdjustment * 0.4);
  }

  private getPerilsForType(type: PolicyType): string[] {
    const perilsByType: Record<PolicyType, string[]> = {
      [PolicyType.CROP_INSURANCE]: ['drought', 'flood', 'hail', 'wind', 'frost', 'disease'],
      [PolicyType.LIVESTOCK_INSURANCE]: ['disease', 'predator_attack', 'weather_stress', 'accident'],
      [PolicyType.EQUIPMENT_INSURANCE]: ['theft', 'fire', 'vandalism', 'mechanical_breakdown'],
      [PolicyType.LIABILITY_INSURANCE]: ['bodily_injury', 'property_damage', 'personal_injury'],
      [PolicyType.WEATHER_INSURANCE]: ['drought', 'excess_rain', 'temperature_extremes'],
      [PolicyType.REVENUE_INSURANCE]: ['yield_loss', 'price_decline', 'quality_adjustment'],
      [PolicyType.MULTI_PERIL_CROP]: ['drought', 'flood', 'hail', 'wind', 'frost', 'disease', 'pest'],
      [PolicyType.HAIL_INSURANCE]: ['hail_damage']
    };

    return perilsByType[type] || [];
  }

  private calculateDiscounts(request: PolicyQuoteRequest, provider: IInsuranceProvider): Array<{
    type: string;
    description: string;
    amount: number;
    percentage: number;
  }> {
    const discounts = [];
    
    // Example discounts - in production, these would be based on provider-specific rules
    if (request.farmDetails.acreage > 1000) {
      discounts.push({
        type: 'large_farm',
        description: 'Large Farm Discount',
        amount: 500,
        percentage: 5
      });
    }
    
    if (request.riskFactors && Object.keys(request.riskFactors).length > 0) {
      discounts.push({
        type: 'risk_management',
        description: 'Risk Management Practices Discount',
        amount: 250,
        percentage: 2.5
      });
    }

    return discounts;
  }
}