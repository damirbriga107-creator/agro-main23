import { Router, Express } from 'express';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { FarmService } from '../services/farm.service';
import { ServiceDependencies } from './index';

/**
 * Setup farm management routes
 */
export function setupFarmRoutes(app: Express, dependencies: ServiceDependencies, basePath: string): void {
  const router = Router();
  const { logger, prisma, config } = dependencies;
  
  // Initialize farm service
  const farmService = new FarmService(prisma);

  /**
   * @route GET /api/v1/farms
   * @desc Get all farms for authenticated user
   * @access Private
   */
  router.get(
    '/',
    AuthMiddleware.authenticate,
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching farms for user', {
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const { page = '1', limit = '10', search } = req.query;
        const farms = await farmService.getFarmsForUser(req.user.userId, {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          search: search as string
        });

        res.json({
          success: true,
          data: farms,
          message: 'Farms retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route GET /api/v1/farms/:id
   * @desc Get specific farm by ID
   * @access Private
   */
  router.get(
    '/:id',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching farm by ID', {
        farmId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const farm = await farmService.getFarmById(req.params.id, req.user.userId);

        if (!farm) {
          return res.status(404).json({
            error: {
              code: 'FARM_NOT_FOUND',
              message: 'Farm not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: farm,
          message: 'Farm retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route POST /api/v1/farms
   * @desc Create a new farm
   * @access Private
   */
  router.post(
    '/',
    AuthMiddleware.authenticate,
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.farmSchemas.createFarm),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Creating new farm', {
        userId: req.user?.userId,
        farmName: req.body.name,
        requestId: req.headers['x-request-id']
      });

      try {
        const farmData = {
          name: req.body.name,
          description: req.body.description,
          totalAcres: req.body.totalAcres,
          farmType: req.body.farmType,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          country: req.body.country,
          zipCode: req.body.zipCode,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          certifications: req.body.certifications || []
        };

        const farm = await farmService.createFarm(farmData, req.user.userId);

        res.status(201).json({
          success: true,
          data: farm,
          message: 'Farm created successfully'
        });
      } catch (error) {
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            error: {
              code: 'FARM_ALREADY_EXISTS',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }
        
        throw error;
      }
    })
  );

  /**
   * @route PUT /api/v1/farms/:id
   * @desc Update farm information
   * @access Private
   */
  router.put(
    '/:id',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.farmSchemas.updateFarm),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Updating farm', {
        farmId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const updateData = {
          name: req.body.name,
          description: req.body.description,
          totalAcres: req.body.totalAcres,
          farmType: req.body.farmType,
          address: req.body.address,
          city: req.body.city,
          state: req.body.state,
          country: req.body.country,
          zipCode: req.body.zipCode,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          certifications: req.body.certifications,
          isActive: req.body.isActive
        };

        const farm = await farmService.updateFarm(req.params.id, updateData, req.user.userId);

        if (!farm) {
          return res.status(404).json({
            error: {
              code: 'FARM_NOT_FOUND',
              message: 'Farm not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: farm,
          message: 'Farm updated successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route DELETE /api/v1/farms/:id
   * @desc Delete farm (soft delete)
   * @access Private
   */
  router.delete(
    '/:id',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Deleting farm', {
        farmId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const success = await farmService.deleteFarm(req.params.id, req.user.userId);

        if (!success) {
          return res.status(404).json({
            error: {
              code: 'FARM_NOT_FOUND',
              message: 'Farm not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          message: 'Farm deleted successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route GET /api/v1/farms/:id/members
   * @desc Get farm members
   * @access Private
   */
  router.get(
    '/:id/members',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching farm members', {
        farmId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const members = await farmService.getFarmMembers(req.params.id, req.user.userId);

        if (!members) {
          return res.status(404).json({
            error: {
              code: 'FARM_NOT_FOUND',
              message: 'Farm not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: members,
          message: 'Farm members retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route POST /api/v1/farms/:id/members
   * @desc Add member to farm
   * @access Private
   */
  router.post(
    '/:id/members',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.farmSchemas.addMember),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Adding farm member', {
        farmId: req.params.id,
        newMemberEmail: req.body.email,
        role: req.body.role,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const member = await farmService.addFarmMember(
          req.params.id,
          req.body.email,
          req.body.role,
          req.user.userId
        );

        res.status(201).json({
          success: true,
          data: member,
          message: 'Farm member added successfully'
        });
      } catch (error) {
        if (error.message.includes('not found')) {
          return res.status(404).json({
            error: {
              code: 'USER_OR_FARM_NOT_FOUND',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        if (error.message.includes('already a member')) {
          return res.status(409).json({
            error: {
              code: 'USER_ALREADY_MEMBER',
              message: error.message,
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        throw error;
      }
    })
  );

  /**
   * @route PUT /api/v1/farms/:farmId/members/:memberId
   * @desc Update farm member role
   * @access Private
   */
  router.put(
    '/:farmId/members/:memberId',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('farmId'),
    ValidationMiddleware.validateUUID('memberId'),
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.farmSchemas.updateMember),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Updating farm member', {
        farmId: req.params.farmId,
        memberId: req.params.memberId,
        newRole: req.body.role,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const member = await farmService.updateFarmMember(
          req.params.farmId,
          req.params.memberId,
          req.body.role,
          req.user.userId
        );

        if (!member) {
          return res.status(404).json({
            error: {
              code: 'MEMBER_NOT_FOUND',
              message: 'Farm member not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: member,
          message: 'Farm member updated successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route DELETE /api/v1/farms/:farmId/members/:memberId
   * @desc Remove member from farm
   * @access Private
   */
  router.delete(
    '/:farmId/members/:memberId',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('farmId'),
    ValidationMiddleware.validateUUID('memberId'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Removing farm member', {
        farmId: req.params.farmId,
        memberId: req.params.memberId,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const success = await farmService.removeFarmMember(
          req.params.farmId,
          req.params.memberId,
          req.user.userId
        );

        if (!success) {
          return res.status(404).json({
            error: {
              code: 'MEMBER_NOT_FOUND',
              message: 'Farm member not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          message: 'Farm member removed successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  // Mount the router
  app.use(basePath, router);
}