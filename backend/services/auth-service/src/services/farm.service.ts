import { PrismaService } from './prisma.service';
import { Farm, FarmMember, FarmType, FarmMemberRole, Prisma } from '@prisma/client';

interface CreateFarmData {
  name: string;
  description?: string;
  totalAcres: number;
  farmType: FarmType;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  certifications?: string[];
}

interface UpdateFarmData {
  name?: string;
  description?: string;
  totalAcres?: number;
  farmType?: FarmType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  certifications?: string[];
  isActive?: boolean;
}

interface FarmQueryOptions {
  page: number;
  limit: number;
  search?: string;
}

export class FarmService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all farms for a user with pagination and search
   */
  async getFarmsForUser(userId: string, options: FarmQueryOptions) {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.FarmWhereInput = {
      members: {
        some: {
          userId: userId,
          leftAt: null // Only active members
        }
      },
      isActive: true
    };

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [farms, total] = await Promise.all([
      this.prisma.client.farm.findMany({
        where: whereClause,
        include: {
          members: {
            where: {
              userId: userId,
              leftAt: null
            },
            select: {
              role: true
            }
          },
          crops: {
            where: {
              status: {
                in: ['PLANNED', 'PLANTED', 'GROWING']
              }
            },
            select: {
              id: true,
              name: true,
              status: true,
              acres: true
            }
          },
          _count: {
            select: {
              members: {
                where: { leftAt: null }
              },
              crops: true,
              transactions: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.client.farm.count({ where: whereClause })
    ]);

    return {
      farms: farms.map(farm => ({
        ...farm,
        userRole: farm.members[0]?.role || null,
        members: undefined // Remove members from response, we only needed it for role
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a specific farm by ID for a user
   */
  async getFarmById(farmId: string, userId: string) {
    const farm = await this.prisma.client.farm.findFirst({
      where: {
        id: farmId,
        members: {
          some: {
            userId: userId,
            leftAt: null
          }
        },
        isActive: true
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        crops: {
          select: {
            id: true,
            name: true,
            variety: true,
            acres: true,
            status: true,
            plantingDate: true,
            expectedHarvestDate: true,
            seasonYear: true
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });

    if (!farm) return null;

    // Get user's role in this farm
    const userRole = farm.members.find(member => member.userId === userId)?.role;

    return {
      ...farm,
      userRole
    };
  }

  /**
   * Create a new farm
   */
  async createFarm(farmData: CreateFarmData, ownerId: string) {
    // Check if user already has a farm with this name
    const existingFarm = await this.prisma.client.farm.findFirst({
      where: {
        name: farmData.name,
        members: {
          some: {
            userId: ownerId,
            leftAt: null
          }
        }
      }
    });

    if (existingFarm) {
      throw new Error(`A farm with name "${farmData.name}" already exists for this user`);
    }

    const farm = await this.prisma.client.farm.create({
      data: {
        ...farmData,
        members: {
          create: {
            userId: ownerId,
            role: FarmMemberRole.OWNER
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    return farm;
  }

  /**
   * Update farm information
   */
  async updateFarm(farmId: string, updateData: UpdateFarmData, userId: string) {
    // Check if user has permission to update this farm (OWNER or MANAGER)
    const farmMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId,
        leftAt: null,
        role: {
          in: [FarmMemberRole.OWNER, FarmMemberRole.MANAGER]
        }
      }
    });

    if (!farmMember) {
      return null;
    }

    // Remove undefined values from update data
    const cleanUpdateData = Object.entries(updateData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    const farm = await this.prisma.client.farm.update({
      where: { id: farmId },
      data: cleanUpdateData,
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            crops: true,
            transactions: true
          }
        }
      }
    });

    return farm;
  }

  /**
   * Delete farm (soft delete)
   */
  async deleteFarm(farmId: string, userId: string): Promise<boolean> {
    // Check if user is the owner of this farm
    const farmMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId,
        leftAt: null,
        role: FarmMemberRole.OWNER
      }
    });

    if (!farmMember) {
      return false;
    }

    await this.prisma.client.farm.update({
      where: { id: farmId },
      data: { isActive: false }
    });

    return true;
  }

  /**
   * Get farm members
   */
  async getFarmMembers(farmId: string, userId: string) {
    // Check if user has access to this farm
    const userMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId,
        leftAt: null
      }
    });

    if (!userMember) {
      return null;
    }

    const members = await this.prisma.client.farmMember.findMany({
      where: {
        farmId,
        leftAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            phone: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then MANAGER, etc.
        { joinedAt: 'asc' }
      ]
    });

    return members;
  }

  /**
   * Add a new member to farm
   */
  async addFarmMember(farmId: string, memberEmail: string, role: FarmMemberRole, inviterId: string) {
    // Check if inviter has permission (OWNER or MANAGER)
    const inviterMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId: inviterId,
        leftAt: null,
        role: {
          in: [FarmMemberRole.OWNER, FarmMemberRole.MANAGER]
        }
      }
    });

    if (!inviterMember) {
      throw new Error('Access denied: insufficient permissions to add members');
    }

    // Find user by email
    const user = await this.prisma.client.user.findUnique({
      where: { email: memberEmail }
    });

    if (!user) {
      throw new Error(`User with email ${memberEmail} not found`);
    }

    // Check if user is already a member
    const existingMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId: user.id,
        leftAt: null
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this farm');
    }

    // Prevent adding multiple owners
    if (role === FarmMemberRole.OWNER) {
      const existingOwner = await this.prisma.client.farmMember.findFirst({
        where: {
          farmId,
          role: FarmMemberRole.OWNER,
          leftAt: null
        }
      });

      if (existingOwner) {
        throw new Error('Farm already has an owner');
      }
    }

    const member = await this.prisma.client.farmMember.create({
      data: {
        farmId,
        userId: user.id,
        role
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    return member;
  }

  /**
   * Update farm member role
   */
  async updateFarmMember(farmId: string, memberId: string, newRole: FarmMemberRole, updaterId: string) {
    // Check if updater has permission (OWNER)
    const updaterMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId: updaterId,
        leftAt: null,
        role: FarmMemberRole.OWNER
      }
    });

    if (!updaterMember) {
      return null;
    }

    // Get the member to update
    const memberToUpdate = await this.prisma.client.farmMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!memberToUpdate || memberToUpdate.farmId !== farmId || memberToUpdate.leftAt) {
      return null;
    }

    // Prevent owner from demoting themselves if they're the only owner
    if (memberToUpdate.userId === updaterId && memberToUpdate.role === FarmMemberRole.OWNER && newRole !== FarmMemberRole.OWNER) {
      const ownerCount = await this.prisma.client.farmMember.count({
        where: {
          farmId,
          role: FarmMemberRole.OWNER,
          leftAt: null
        }
      });

      if (ownerCount === 1) {
        throw new Error('Cannot remove the last owner of the farm');
      }
    }

    const updatedMember = await this.prisma.client.farmMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        }
      }
    });

    return updatedMember;
  }

  /**
   * Remove member from farm
   */
  async removeFarmMember(farmId: string, memberId: string, removerId: string): Promise<boolean> {
    // Check if remover has permission (OWNER or removing themselves)
    const removerMember = await this.prisma.client.farmMember.findFirst({
      where: {
        farmId,
        userId: removerId,
        leftAt: null
      }
    });

    if (!removerMember) {
      return false;
    }

    const memberToRemove = await this.prisma.client.farmMember.findUnique({
      where: { id: memberId }
    });

    if (!memberToRemove || memberToRemove.farmId !== farmId || memberToRemove.leftAt) {
      return false;
    }

    // Check permissions: OWNER can remove anyone, users can remove themselves
    const canRemove = removerMember.role === FarmMemberRole.OWNER || memberToRemove.userId === removerId;

    if (!canRemove) {
      return false;
    }

    // Prevent removing the last owner
    if (memberToRemove.role === FarmMemberRole.OWNER) {
      const ownerCount = await this.prisma.client.farmMember.count({
        where: {
          farmId,
          role: FarmMemberRole.OWNER,
          leftAt: null
        }
      });

      if (ownerCount === 1) {
        throw new Error('Cannot remove the last owner of the farm');
      }
    }

    // Soft delete - set leftAt timestamp
    await this.prisma.client.farmMember.update({
      where: { id: memberId },
      data: { leftAt: new Date() }
    });

    return true;
  }
}