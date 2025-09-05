import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

interface CreateCropData {
  name: string;
  variety?: string;
  acres: number;
  plantingDate?: Date;
  expectedHarvestDate?: Date;
  seasonYear: number;
  expectedYield?: number;
  yieldUnit?: string;
}

interface UpdateCropData {
  name?: string;
  variety?: string;
  acres?: number;
  plantingDate?: Date;
  expectedHarvestDate?: Date;
  actualHarvestDate?: Date;
  status?: string; // CropStatus enum
  seasonYear?: number;
  expectedYield?: number;
  actualYield?: number;
  yieldUnit?: string;
}

interface CropQueryOptions {
  page: number;
  limit: number;
  status?: string;
  seasonYear?: number;
}

interface HarvestData {
  actualYield: number;
  actualHarvestDate: Date;
  yieldUnit?: string;
}

export class CropService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all crops for a farm with pagination and filters
   */
  async getCropsForFarm(farmId: string, userId: string, options: CropQueryOptions) {
    // First check if user has access to this farm
    const farmAccess = await this.checkFarmAccess(farmId, userId);
    if (!farmAccess) return null;

    const { page, limit, status, seasonYear } = options;
    const skip = (page - 1) * limit;

    const whereClause: any = { // CropWhereInput type not available
      farmId
    };

    // Add status filter
    if (status) {
      whereClause.status = status; // CropStatus enum
    }

    // Add season year filter
    if (seasonYear) {
      whereClause.seasonYear = seasonYear;
    }

    const [crops, total] = await Promise.all([
      this.prisma.client.crop.findMany({
        where: whereClause,
        include: {
          farm: {
            select: {
              id: true,
              name: true
            }
          },
          transactions: {
            select: {
              id: true,
              amount: true,
              transactionType: true,
              description: true,
              transactionDate: true
            },
            orderBy: { transactionDate: 'desc' },
            take: 5 // Latest 5 transactions
          },
          _count: {
            select: {
              transactions: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { seasonYear: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      this.prisma.client.crop.count({ where: whereClause })
    ]);

    // Calculate financial summary for each crop
    const cropsWithFinancials = await Promise.all(
      crops.map(async (crop) => {
        const financialSummary = await this.calculateCropFinancials(crop.id);
        return {
          ...crop,
          financials: financialSummary
        };
      })
    );

    return {
      crops: cropsWithFinancials,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a specific crop by ID
   */
  async getCropById(cropId: string, userId: string) {
    const crop = await this.prisma.client.crop.findUnique({
      where: { id: cropId },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            members: {
              where: {
                userId,
                leftAt: null
              },
              select: {
                role: true
              }
            }
          }
        },
        transactions: {
          select: {
            id: true,
            amount: true,
            transactionType: true,
            description: true,
            transactionDate: true,
            category: {
              select: {
                name: true,
                categoryType: true
              }
            }
          },
          orderBy: { transactionDate: 'desc' }
        }
      }
    });

    if (!crop || !crop.farm.members.length) {
      return null;
    }

    // Calculate detailed financials
    const financialSummary = await this.calculateCropFinancials(cropId);
    const profitability = await this.calculateCropProfitability(cropId);

    return {
      ...crop,
      userRole: crop.farm.members[0]?.role,
      financials: financialSummary,
      profitability
    };
  }

  /**
   * Create a new crop
   */
  async createCrop(farmId: string, cropData: CreateCropData, userId: string) {
    // Check if user has permission to create crops (OWNER, MANAGER, or MEMBER)
    const farmMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId,
        leftAt: null,
        role: {
          in: ['OWNER', 'MANAGER', 'MEMBER'] // FarmMemberRole enum values
        }
      }
    });

    if (!farmMember) {
      return null;
    }

    // Check if crop with same name and season already exists for this farm
    const existingCrop = await this.prisma.client.crop.findFirst({
      where: {
        farmId,
        name: cropData.name,
        seasonYear: cropData.seasonYear
      }
    });

    if (existingCrop) {
      throw new Error(`Crop "${cropData.name}" already exists for season ${cropData.seasonYear}`);
    }

    const crop = await this.prisma.client.crop.create({
      data: {
        ...cropData,
        farmId,
        status: 'PLANNED' // CropStatus.PLANNED
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return crop;
  }

  /**
   * Update crop information
   */
  async updateCrop(cropId: string, updateData: UpdateCropData, userId: string) {
    // Check if user has permission to update this crop
    const crop = await this.prisma.client.crop.findUnique({
      where: { id: cropId },
      include: {
        farm: {
          select: {
            members: {
              where: {
                userId,
                leftAt: null,
                role: {
                  in: ['OWNER', 'MANAGER', 'MEMBER'] // FarmMemberRole enum values
                }
              }
            }
          }
        }
      }
    });

    if (!crop || !crop.farm.members.length) {
      return null;
    }

    // Remove undefined values from update data
    const cleanUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    const updatedCrop = await this.prisma.client.crop.update({
      where: { id: cropId },
      data: cleanUpdateData,
      include: {
        farm: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    // Calculate updated financials
    const financialSummary = await this.calculateCropFinancials(cropId);

    return {
      ...updatedCrop,
      financials: financialSummary
    };
  }

  /**
   * Delete crop
   */
  async deleteCrop(cropId: string, userId: string): Promise<boolean> {
    // Check if user has permission to delete this crop (OWNER or MANAGER)
    const crop = await this.prisma.client.crop.findUnique({
      where: { id: cropId },
      include: {
        farm: {
          select: {
            members: {
              where: {
                userId,
                leftAt: null,
                role: {
                  in: ['OWNER', 'MANAGER'] // FarmMemberRole enum values
                }
              }
            }
          }
        }
      }
    });

    if (!crop || !crop.farm.members.length) {
      return false;
    }

    // Check if crop has transactions - if so, we should soft delete instead
    const transactionCount = await this.prisma.client.transaction.count({
      where: { cropId }
    });

    if (transactionCount > 0) {
      // For crops with transactions, we could implement a soft delete
      // For now, we'll prevent deletion
      throw new Error('Cannot delete crop with existing transactions. Please archive instead.');
    }

    await this.prisma.client.crop.delete({
      where: { id: cropId }
    });

    return true;
  }

  /**
   * Get crop profitability analysis
   */
  async getCropProfitability(cropId: string, userId: string) {
    const crop = await this.prisma.client.crop.findUnique({
      where: { id: cropId },
      include: {
        farm: {
          select: {
            members: {
              where: {
                userId,
                leftAt: null
              }
            }
          }
        }
      }
    });

    if (!crop || !crop.farm.members.length) {
      return null;
    }

    const profitability = await this.calculateCropProfitability(cropId);
    const financials = await this.calculateCropFinancials(cropId);

    return {
      crop: {
        id: crop.id,
        name: crop.name,
        variety: crop.variety,
        acres: crop.acres,
        seasonYear: crop.seasonYear,
        status: crop.status
      },
      financials,
      profitability
    };
  }

  /**
   * Get crop summary for a farm
   */
  async getCropSummaryForFarm(farmId: string, userId: string, seasonYear?: number) {
    // Check farm access
    const farmAccess = await this.checkFarmAccess(farmId, userId);
    if (!farmAccess) return null;

    const whereClause: any = { farmId }; // CropWhereInput type not available
    if (seasonYear) {
      whereClause.seasonYear = seasonYear;
    }

    const [crops, totalCrops] = await Promise.all([
      this.prisma.client.crop.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          acres: true,
          status: true,
          seasonYear: true,
          expectedYield: true,
          actualYield: true,
          yieldUnit: true
        }
      }),
      this.prisma.client.crop.count({ where: whereClause })
    ]);

    // Calculate summary statistics
    const totalAcres = crops.reduce((sum, crop) => sum + Number(crop.acres), 0);
    const statusCounts = crops.reduce((acc, crop) => {
      acc[crop.status] = (acc[crop.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>); // CropStatus enum

    // Calculate financial summary for all crops
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    for (const crop of crops) {
      const financials = await this.calculateCropFinancials(crop.id);
      totalRevenue += financials.totalRevenue;
      totalExpenses += financials.totalExpenses;
    }

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      summary: {
        totalCrops,
        totalAcres,
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        statusBreakdown: statusCounts
      },
      crops: crops.map(crop => ({
        ...crop,
        acres: Number(crop.acres),
        expectedYield: crop.expectedYield ? Number(crop.expectedYield) : null,
        actualYield: crop.actualYield ? Number(crop.actualYield) : null
      })),
      seasonYear: seasonYear || new Date().getFullYear()
    };
  }

  /**
   * Record harvest for a crop
   */
  async recordHarvest(cropId: string, harvestData: HarvestData, userId: string) {
    // Check permissions
    const crop = await this.prisma.client.crop.findUnique({
      where: { id: cropId },
      include: {
        farm: {
          select: {
            members: {
              where: {
                userId,
                leftAt: null,
                role: {
                  in: ['OWNER', 'MANAGER', 'MEMBER'] // FarmMemberRole enum values
                }
              }
            }
          }
        }
      }
    });

    if (!crop || !crop.farm.members.length) {
      return null;
    }

    const updatedCrop = await this.prisma.client.crop.update({
      where: { id: cropId },
      data: {
        actualYield: harvestData.actualYield,
        actualHarvestDate: harvestData.actualHarvestDate,
        yieldUnit: harvestData.yieldUnit || crop.yieldUnit,
        status: 'HARVESTED' // CropStatus.HARVESTED
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Calculate updated profitability
    const profitability = await this.calculateCropProfitability(cropId);
    const financials = await this.calculateCropFinancials(cropId);

    return {
      ...updatedCrop,
      financials,
      profitability,
      actualYield: Number(updatedCrop.actualYield)
    };
  }

  /**
   * Private helper: Check if user has access to farm
   */
  private async checkFarmAccess(farmId: string, userId: string): Promise<boolean> {
    const farmMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId,
        leftAt: null
      }
    });
    
    return !!farmMember;
  }

  /**
   * Private helper: Calculate crop financial summary
   */
  private async calculateCropFinancials(cropId: string) {
    const transactions = await this.prisma.client.transaction.findMany({
      where: { cropId },
      select: {
        amount: true,
        transactionType: true
      }
    });

    const totalRevenue = transactions
      .filter(t => t.transactionType === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpenses = transactions
      .filter(t => t.transactionType === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount: transactions.length
    };
  }

  /**
   * Private helper: Calculate crop profitability metrics
   */
  private async calculateCropProfitability(cropId: string) {
    const crop = await this.prisma.client.crop.findUnique({
      where: { id: cropId },
      select: {
        acres: true,
        expectedYield: true,
        actualYield: true,
        yieldUnit: true
      }
    });

    if (!crop) return null;

    const financials = await this.calculateCropFinancials(cropId);
    const acres = Number(crop.acres);
    
    // Calculate per-acre metrics
    const revenuePerAcre = acres > 0 ? financials.totalRevenue / acres : 0;
    const expensesPerAcre = acres > 0 ? financials.totalExpenses / acres : 0;
    const profitPerAcre = revenuePerAcre - expensesPerAcre;

    // Calculate yield efficiency
    const expectedYield = crop.expectedYield ? Number(crop.expectedYield) : 0;
    const actualYield = crop.actualYield ? Number(crop.actualYield) : 0;
    const yieldEfficiency = expectedYield > 0 ? (actualYield / expectedYield) * 100 : 0;

    // Calculate per-unit metrics
    const revenuePerUnit = actualYield > 0 ? financials.totalRevenue / actualYield : 0;
    const expensesPerUnit = actualYield > 0 ? financials.totalExpenses / actualYield : 0;

    return {
      acres,
      revenuePerAcre,
      expensesPerAcre,
      profitPerAcre,
      expectedYield,
      actualYield,
      yieldUnit: crop.yieldUnit,
      yieldEfficiency,
      revenuePerUnit,
      expensesPerUnit,
      ...financials
    };
  }
}