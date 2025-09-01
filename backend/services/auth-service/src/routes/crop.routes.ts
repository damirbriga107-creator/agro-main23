import { Router, Express } from 'express';
import { ValidationMiddleware } from '../middleware/validation.middleware';
import { ErrorHandlerMiddleware } from '../middleware/error-handler.middleware';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { CropService } from '../services/crop.service';
import { ServiceDependencies } from './index';

/**
 * Setup crop management routes
 */
export function setupCropRoutes(app: Express, dependencies: ServiceDependencies, basePath: string): void {
  const router = Router();
  const { logger, prisma, config } = dependencies;
  
  // Initialize crop service
  const cropService = new CropService(prisma);

  /**
   * @route GET /api/v1/farms/:farmId/crops
   * @desc Get all crops for a specific farm
   * @access Private
   */
  router.get(
    '/farms/:farmId/crops',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('farmId'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching crops for farm', {
        farmId: req.params.farmId,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const { page = '1', limit = '10', status, seasonYear } = req.query;
        const crops = await cropService.getCropsForFarm(req.params.farmId, req.user.userId, {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          status: status as string,
          seasonYear: seasonYear ? parseInt(seasonYear as string) : undefined
        });

        if (!crops) {
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
          data: crops,
          message: 'Crops retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route GET /api/v1/crops/:id
   * @desc Get specific crop by ID
   * @access Private
   */
  router.get(
    '/:id',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching crop by ID', {
        cropId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const crop = await cropService.getCropById(req.params.id, req.user.userId);

        if (!crop) {
          return res.status(404).json({
            error: {
              code: 'CROP_NOT_FOUND',
              message: 'Crop not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: crop,
          message: 'Crop retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route POST /api/v1/farms/:farmId/crops
   * @desc Create a new crop for a farm
   * @access Private
   */
  router.post(
    '/farms/:farmId/crops',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('farmId'),
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.cropSchemas.createCrop),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Creating new crop', {
        farmId: req.params.farmId,
        cropName: req.body.name,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const cropData = {
          name: req.body.name,
          variety: req.body.variety,
          acres: req.body.acres,
          plantingDate: req.body.plantingDate,
          expectedHarvestDate: req.body.expectedHarvestDate,
          seasonYear: req.body.seasonYear,
          expectedYield: req.body.expectedYield,
          yieldUnit: req.body.yieldUnit
        };

        const crop = await cropService.createCrop(req.params.farmId, cropData, req.user.userId);

        if (!crop) {
          return res.status(404).json({
            error: {
              code: 'FARM_NOT_FOUND',
              message: 'Farm not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.status(201).json({
          success: true,
          data: crop,
          message: 'Crop created successfully'
        });
      } catch (error) {
        if (error.message.includes('already exists')) {
          return res.status(409).json({
            error: {
              code: 'CROP_ALREADY_EXISTS',
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
   * @route PUT /api/v1/crops/:id
   * @desc Update crop information
   * @access Private
   */
  router.put(
    '/:id',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.cropSchemas.updateCrop),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Updating crop', {
        cropId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const updateData = {
          name: req.body.name,
          variety: req.body.variety,
          acres: req.body.acres,
          plantingDate: req.body.plantingDate,
          expectedHarvestDate: req.body.expectedHarvestDate,
          actualHarvestDate: req.body.actualHarvestDate,
          status: req.body.status,
          seasonYear: req.body.seasonYear,
          expectedYield: req.body.expectedYield,
          actualYield: req.body.actualYield,
          yieldUnit: req.body.yieldUnit
        };

        const crop = await cropService.updateCrop(req.params.id, updateData, req.user.userId);

        if (!crop) {
          return res.status(404).json({
            error: {
              code: 'CROP_NOT_FOUND',
              message: 'Crop not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: crop,
          message: 'Crop updated successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route DELETE /api/v1/crops/:id
   * @desc Delete crop
   * @access Private
   */
  router.delete(
    '/:id',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Deleting crop', {
        cropId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const success = await cropService.deleteCrop(req.params.id, req.user.userId);

        if (!success) {
          return res.status(404).json({
            error: {
              code: 'CROP_NOT_FOUND',
              message: 'Crop not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          message: 'Crop deleted successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route GET /api/v1/crops/:id/profitability
   * @desc Get crop profitability analysis
   * @access Private
   */
  router.get(
    '/:id/profitability',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching crop profitability', {
        cropId: req.params.id,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const profitability = await cropService.getCropProfitability(req.params.id, req.user.userId);

        if (!profitability) {
          return res.status(404).json({
            error: {
              code: 'CROP_NOT_FOUND',
              message: 'Crop not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: profitability,
          message: 'Crop profitability retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route GET /api/v1/farms/:farmId/crops/summary
   * @desc Get crop summary for a farm
   * @access Private
   */
  router.get(
    '/farms/:farmId/crops/summary',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('farmId'),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Fetching crop summary for farm', {
        farmId: req.params.farmId,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const { seasonYear } = req.query;
        const summary = await cropService.getCropSummaryForFarm(
          req.params.farmId, 
          req.user.userId,
          seasonYear ? parseInt(seasonYear as string) : undefined
        );

        if (!summary) {
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
          data: summary,
          message: 'Crop summary retrieved successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  /**
   * @route PUT /api/v1/crops/:id/harvest
   * @desc Record harvest for a crop
   * @access Private
   */
  router.put(
    '/:id/harvest',
    AuthMiddleware.authenticate,
    ValidationMiddleware.validateUUID('id'),
    ValidationMiddleware.sanitizeInput,
    ValidationMiddleware.validate(ValidationMiddleware.cropSchemas.recordHarvest),
    ErrorHandlerMiddleware.asyncHandler(async (req, res) => {
      logger.info('Recording crop harvest', {
        cropId: req.params.id,
        actualYield: req.body.actualYield,
        userId: req.user?.userId,
        requestId: req.headers['x-request-id']
      });

      try {
        const harvestData = {
          actualYield: req.body.actualYield,
          actualHarvestDate: req.body.actualHarvestDate || new Date(),
          yieldUnit: req.body.yieldUnit
        };

        const crop = await cropService.recordHarvest(req.params.id, harvestData, req.user.userId);

        if (!crop) {
          return res.status(404).json({
            error: {
              code: 'CROP_NOT_FOUND',
              message: 'Crop not found or access denied',
              timestamp: new Date().toISOString(),
              requestId: req.headers['x-request-id']
            }
          });
        }

        res.json({
          success: true,
          data: crop,
          message: 'Harvest recorded successfully'
        });
      } catch (error) {
        throw error;
      }
    })
  );

  // Mount the router
  app.use(basePath, router);
}