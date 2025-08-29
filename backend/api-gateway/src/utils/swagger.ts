import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { Application } from 'express';
import path from 'path';
import { EnvironmentUtils } from '@daorsagro/config';

/**
 * Swagger API documentation configuration
 */
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'DaorsAgro API Gateway',
    version: '1.0.0',
    description: 'Comprehensive agricultural financial management platform API',
    contact: {
      name: 'DaorsAgro Support',
      email: 'support@daorsagro.com',
      url: 'https://daorsagro.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: EnvironmentUtils.get('API_BASE_URL', 'http://localhost:3000'),
      description: 'Development server'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check endpoint',
        description: 'Check the health status of the API Gateway and connected services',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string' },
                    checks: {
                      type: 'object',
                      properties: {
                        database: { $ref: '#/components/schemas/HealthStatus' },
                        redis: { $ref: '#/components/schemas/HealthStatus' },
                        externalApis: { $ref: '#/components/schemas/HealthStatus' }
                      }
                    }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['System'],
        summary: 'Get system metrics',
        description: 'Retrieve performance and usage metrics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Metrics retrieved successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MetricsResponse' }
              }
            }
          }
        }
      }
    },
    '/api/version': {
      get: {
        tags: ['System'],
        summary: 'Get API version information',
        description: 'Retrieve version and environment information',
        responses: {
          '200': {
            description: 'Version information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    service: { type: 'string' },
                    version: { type: 'string' },
                    environment: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate user and return JWT tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Register a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/v1/financial/transactions': {
      get: {
        tags: ['Financial'],
        summary: 'Get financial transactions',
        description: 'Retrieve financial transactions with pagination and filtering',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/PageSizeParam' },
          { $ref: '#/components/parameters/StartDateParam' },
          { $ref: '#/components/parameters/EndDateParam' }
        ],
        responses: {
          '200': {
            description: 'Transactions retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Transaction' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Financial'],
        summary: 'Create new transaction',
        description: 'Create a new financial transaction',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTransactionRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Transaction created successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/ApiResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/Transaction' }
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    parameters: {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: { type: 'integer', minimum: 1, default: 1 }
      },
      PageSizeParam: {
        name: 'pageSize',
        in: 'query',
        description: 'Number of items per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      },
      StartDateParam: {
        name: 'startDate',
        in: 'query',
        description: 'Start date for filtering (ISO 8601)',
        schema: { type: 'string', format: 'date-time' }
      },
      EndDateParam: {
        name: 'endDate',
        in: 'query',
        description: 'End date for filtering (ISO 8601)',
        schema: { type: 'string', format: 'date-time' }
      }
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              pagination: { $ref: '#/components/schemas/PaginationMeta' }
            }
          },
          links: {
            type: 'object',
            properties: {
              self: { type: 'string' },
              next: { type: 'string' },
              prev: { type: 'string' }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string' }
            }
          }
        }
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          totalItems: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' }
        }
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          responseTime: { type: 'number' }
        }
      },
      MetricsResponse: {
        type: 'object',
        properties: {
          requests: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              successful: { type: 'integer' },
              failed: { type: 'integer' },
              averageResponseTime: { type: 'number' }
            }
          },
          services: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                status: { type: 'string' },
                responseTime: { type: 'number' },
                errorRate: { type: 'number' }
              }
            }
          }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              tokens: { $ref: '#/components/schemas/AuthTokens' }
            }
          }
        }
      },
      AuthTokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { type: 'string', enum: ['farmer', 'advisor', 'admin', 'support'] },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1 },
          lastName: { type: 'string', minLength: 1 },
          phone: { type: 'string' }
        }
      },
      Transaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          farmId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', format: 'decimal' },
          transactionType: { type: 'string', enum: ['income', 'expense'] },
          description: { type: 'string' },
          transactionDate: { type: 'string', format: 'date' },
          receiptUrl: { type: 'string', format: 'uri' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      CreateTransactionRequest: {
        type: 'object',
        required: ['farmId', 'categoryId', 'amount', 'transactionType', 'description', 'transactionDate'],
        properties: {
          farmId: { type: 'string', format: 'uuid' },
          categoryId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', format: 'decimal', minimum: 0.01 },
          transactionType: { type: 'string', enum: ['income', 'expense'] },
          description: { type: 'string', minLength: 1, maxLength: 500 },
          transactionDate: { type: 'string', format: 'date' },
          paymentMethod: { type: 'string', enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'digital_payment'] },
          vendorName: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  },
  tags: [
    { name: 'System', description: 'System health and information endpoints' },
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Financial', description: 'Financial transaction management' },
    { name: 'Subsidies', description: 'Government subsidy management' },
    { name: 'Insurance', description: 'Insurance policy and claims management' },
    { name: 'Analytics', description: 'Business intelligence and analytics' },
    { name: 'Documents', description: 'Document management and processing' },
    { name: 'Notifications', description: 'Notification and alert management' }
  ]
};

/**
 * Setup Swagger documentation
 */
export function setupSwagger(app: Application): void {
  const isDevelopment = EnvironmentUtils.isDevelopment();
  
  // Swagger UI options
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      persistAuthorization: true
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { background: #fafafa; padding: 20px; margin: 20px 0 }
    `,
    customSiteTitle: 'DaorsAgro API Documentation',
    customfavIcon: '/favicon.ico'
  };

  // Setup Swagger UI
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerOptions));

  // Serve raw swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  // Setup redirection from root docs path
  app.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  // Setup API spec endpoint for tools
  app.get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  console.log('📚 API Documentation available at /api-docs');
}

/**
 * Generate OpenAPI schema for a route
 */
export function generateRouteSchema(
  method: string,
  path: string,
  summary: string,
  description: string,
  options: {
    tags?: string[];
    security?: boolean;
    parameters?: any[];
    requestBody?: any;
    responses?: any;
  } = {}
): any {
  const {
    tags = [],
    security = true,
    parameters = [],
    requestBody,
    responses = {}
  } = options;

  const schema: any = {
    tags,
    summary,
    description,
    parameters,
    responses: {
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' }
          }
        }
      },
      ...responses
    }
  };

  if (security) {
    schema.security = [{ bearerAuth: [] }];
    schema.responses['401'] = {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' }
        }
      }
    };
  }

  if (requestBody) {
    schema.requestBody = requestBody;
  }

  return schema;
}