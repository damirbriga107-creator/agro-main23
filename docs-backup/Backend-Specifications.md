# DaorsAgro - Backend Development Specifications

## Backend Architecture Overview

**DaorsAgro Backend** is built using a microservices architecture with Node.js, TypeScript, and a combination of SQL and NoSQL databases. Each service is containerized and deployed independently with comprehensive API documentation and monitoring.

---

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 20+ LTS
- **Language**: TypeScript 5+
- **Framework**: Express.js 4.18+ with Fastify for high-performance services
- **ORM**: Prisma (PostgreSQL), Mongoose (MongoDB)
- **Message Queue**: Redis + Apache Kafka
- **Caching**: Redis 7+
- **Search**: Elasticsearch 8+

### Development Tools
- **Testing**: Jest, Supertest, TestContainers
- **Documentation**: OpenAPI 3.0, Swagger UI
- **Validation**: Joi, class-validator
- **Logging**: Winston, Morgan
- **Monitoring**: Prometheus, Grafana

---

## Service Architecture

### 1. Authentication Service (`auth-service`)

**Purpose**: Centralized authentication, authorization, and user management

**Technology Stack**:
- Express.js with JWT
- PostgreSQL for user data
- Redis for session management
- OAuth 2.0 integration

**Key Features**:
```typescript
// User registration and authentication
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token

// Password management
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
PUT /api/v1/auth/change-password

// OAuth integration
GET /api/v1/auth/oauth/{provider}
POST /api/v1/auth/oauth/callback

// User profile management
GET /api/v1/users/profile
PUT /api/v1/users/profile
DELETE /api/v1/users/profile
```

**Database Schema**:
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'farmer',
  is_active BOOLEAN DEFAULT true,
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User roles enum
CREATE TYPE user_role AS ENUM ('farmer', 'advisor', 'admin', 'support');
```

**Implementation Structure**:
```
auth-service/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── user.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── oauth.service.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   └── session.repository.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── models/
│   │   ├── user.model.ts
│   │   └── session.model.ts
│   ├── utils/
│   │   ├── jwt.util.ts
│   │   ├── password.util.ts
│   │   └── validation.util.ts
│   └── app.ts
├── tests/
├── Dockerfile
└── package.json
```

### 2. Financial Service (`financial-service`)

**Purpose**: Financial tracking, expense management, and profitability analysis

**Technology Stack**:
- Express.js for API
- PostgreSQL for financial data
- Redis for caching
- Elasticsearch for financial search

**Key Features**:
```typescript
// Transaction management
POST /api/v1/financial/transactions
GET /api/v1/financial/transactions
PUT /api/v1/financial/transactions/:id
DELETE /api/v1/financial/transactions/:id

// Category management
GET /api/v1/financial/categories
POST /api/v1/financial/categories
PUT /api/v1/financial/categories/:id

// Financial reports
GET /api/v1/financial/reports/profit-loss
GET /api/v1/financial/reports/cash-flow
GET /api/v1/financial/reports/budget-analysis
GET /api/v1/financial/reports/crop-profitability

// Budget management
POST /api/v1/financial/budgets
GET /api/v1/financial/budgets
PUT /api/v1/financial/budgets/:id
```

**Database Schema**:
```sql
-- Transaction categories
CREATE TABLE transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_type transaction_type NOT NULL,
  parent_category_id UUID REFERENCES transaction_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Financial transactions
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL,
  category_id UUID REFERENCES transaction_categories(id),
  amount DECIMAL(12,2) NOT NULL,
  transaction_type transaction_type NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL,
  receipt_url VARCHAR(500),
  crop_id UUID,
  season_year INTEGER,
  payment_method payment_method,
  vendor_name VARCHAR(200),
  reference_number VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Budget plans
CREATE TABLE budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  season_year INTEGER NOT NULL,
  total_budget DECIMAL(15,2),
  status budget_status DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enums
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE payment_method AS ENUM ('cash', 'check', 'bank_transfer', 'credit_card', 'digital_payment');
CREATE TYPE budget_status AS ENUM ('draft', 'active', 'completed', 'cancelled');
```

### 3. Subsidy Service (`subsidy-service`)

**Purpose**: Government subsidy management, application tracking, and compliance

**Technology Stack**:
- Express.js for API
- MongoDB for flexible document storage
- PostgreSQL for structured data
- External APIs for government systems

**Key Features**:
```typescript
// Subsidy programs
GET /api/v1/subsidies/programs
GET /api/v1/subsidies/programs/:id/eligibility
POST /api/v1/subsidies/programs/:id/check-eligibility

// Applications
POST /api/v1/subsidies/applications
GET /api/v1/subsidies/applications
GET /api/v1/subsidies/applications/:id
PUT /api/v1/subsidies/applications/:id
POST /api/v1/subsidies/applications/:id/submit
POST /api/v1/subsidies/applications/:id/upload-document

// Compliance tracking
GET /api/v1/subsidies/compliance/requirements
GET /api/v1/subsidies/compliance/status
POST /api/v1/subsidies/compliance/update-status

// Notifications and deadlines
GET /api/v1/subsidies/deadlines
GET /api/v1/subsidies/notifications
POST /api/v1/subsidies/reminders/create
```

**Database Schema (MongoDB)**:
```typescript
// Subsidy Program Schema
interface SubsidyProgram {
  _id: ObjectId;
  name: string;
  description: string;
  programType: 'federal' | 'state' | 'local';
  eligibilityCriteria: {
    farmSize?: { min: number; max: number };
    cropTypes?: string[];
    income?: { max: number };
    location?: string[];
    certifications?: string[];
  };
  benefits: {
    type: 'direct_payment' | 'cost_share' | 'loan_guarantee' | 'insurance_premium';
    amount?: number;
    percentage?: number;
    maxAmount?: number;
  };
  applicationPeriod: {
    startDate: Date;
    endDate: Date;
    deadlines: Date[];
  };
  requiredDocuments: string[];
  contactInfo: {
    agency: string;
    phone: string;
    email: string;
    website: string;
  };
  isActive: boolean;
  lastUpdated: Date;
}

// Subsidy Application Schema
interface SubsidyApplication {
  _id: ObjectId;
  farmId: string;
  userId: string;
  programId: ObjectId;
  applicationData: {
    personalInfo: any;
    farmInfo: any;
    financialInfo: any;
    customFields: Record<string, any>;
  };
  documents: {
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
    verified: boolean;
  }[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'pending_documents';
  timeline: {
    stage: string;
    date: Date;
    notes?: string;
  }[];
  approvedAmount?: number;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 4. Insurance Service (`insurance-service`)

**Purpose**: Insurance comparison, risk assessment, and claims management

**Key Features**:
```typescript
// Insurance providers and policies
GET /api/v1/insurance/providers
GET /api/v1/insurance/policies
POST /api/v1/insurance/quotes/request
GET /api/v1/insurance/quotes/:id
POST /api/v1/insurance/policies/purchase

// Risk assessment
POST /api/v1/insurance/risk-assessment
GET /api/v1/insurance/risk-factors
POST /api/v1/insurance/premium-calculator

// Claims management
POST /api/v1/insurance/claims
GET /api/v1/insurance/claims
GET /api/v1/insurance/claims/:id
PUT /api/v1/insurance/claims/:id/status
POST /api/v1/insurance/claims/:id/documents
```

### 5. Analytics Service (`analytics-service`)

**Purpose**: Business intelligence, predictive analytics, and reporting

**Technology Stack**:
- Fastify for high-performance API
- ClickHouse for analytics data
- TensorFlow.js for ML models
- Python microservices for complex ML

**Key Features**:
```typescript
// Financial analytics
GET /api/v1/analytics/financial/dashboard
GET /api/v1/analytics/financial/trends
POST /api/v1/analytics/financial/forecast

// Crop analytics
GET /api/v1/analytics/crops/yield-prediction
GET /api/v1/analytics/crops/profitability
GET /api/v1/analytics/crops/performance

// Market analytics
GET /api/v1/analytics/market/prices
GET /api/v1/analytics/market/trends
GET /api/v1/analytics/market/recommendations

// Predictive models
POST /api/v1/analytics/models/train
GET /api/v1/analytics/models/predictions
GET /api/v1/analytics/models/accuracy
```

### 6. Document Service (`document-service`)

**Purpose**: Document storage, processing, and compliance management

**Technology Stack**:
- Express.js for API
- MongoDB for metadata
- AWS S3/MinIO for file storage
- OCR service for text extraction

**Key Features**:
```typescript
// Document management
POST /api/v1/documents/upload
GET /api/v1/documents
GET /api/v1/documents/:id
DELETE /api/v1/documents/:id
PUT /api/v1/documents/:id/metadata

// OCR and processing
POST /api/v1/documents/:id/process
GET /api/v1/documents/:id/extracted-data
POST /api/v1/documents/batch-process

// Compliance tracking
GET /api/v1/documents/compliance/requirements
GET /api/v1/documents/compliance/status
POST /api/v1/documents/compliance/audit
```

### 7. Notification Service (`notification-service`)

**Purpose**: Multi-channel notifications and alert management

**Key Features**:
```typescript
// Notification management
POST /api/v1/notifications/send
GET /api/v1/notifications
PUT /api/v1/notifications/:id/read
DELETE /api/v1/notifications/:id

// Subscription management
POST /api/v1/notifications/subscriptions
GET /api/v1/notifications/subscriptions
PUT /api/v1/notifications/subscriptions/:id

// Alert configurations
POST /api/v1/notifications/alerts/create
GET /api/v1/notifications/alerts
PUT /api/v1/notifications/alerts/:id
```

---

## API Gateway Configuration

### Gateway Responsibilities
- Request routing to appropriate services
- Authentication and authorization
- Rate limiting and throttling
- Request/response transformation
- Caching layer
- API versioning
- Monitoring and analytics

### Kong/Nginx Configuration
```yaml
# API Gateway routes configuration
routes:
  - name: auth-service
    url: http://auth-service:3001
    paths: [/api/v1/auth/*, /api/v1/users/*]
    
  - name: financial-service
    url: http://financial-service:3002
    paths: [/api/v1/financial/*]
    middleware: [auth-required]
    
  - name: subsidy-service
    url: http://subsidy-service:3003
    paths: [/api/v1/subsidies/*]
    middleware: [auth-required]
    
  - name: insurance-service
    url: http://insurance-service:3004
    paths: [/api/v1/insurance/*]
    middleware: [auth-required]
```

### Rate Limiting Configuration
```typescript
const rateLimitConfig = {
  '/api/v1/auth/login': { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  '/api/v1/financial/*': { max: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute
  '/api/v1/subsidies/*': { max: 500, windowMs: 60 * 1000 },
  '/api/v1/analytics/*': { max: 100, windowMs: 60 * 1000 },
  default: { max: 100, windowMs: 60 * 1000 }
};
```

---

## Database Design

### PostgreSQL Schemas

**Primary Databases**:
- `auth_db`: User authentication and authorization
- `financial_db`: Financial transactions and analytics
- `farm_db`: Farm information and management

**Connection Configuration**:
```typescript
// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production',
  pool: {
    min: 5,
    max: 20,
    idle: 10000,
    acquire: 60000,
  },
  logging: process.env.NODE_ENV !== 'production'
};
```

### MongoDB Schemas

**Collections**:
- `subsidy_programs`: Government subsidy programs
- `subsidy_applications`: User applications
- `documents`: File metadata and processing results
- `iot_data`: IoT sensor readings and events

---

## Event-Driven Architecture

### Message Queue Configuration
```typescript
// Kafka topics configuration
const kafkaTopics = {
  'user.created': 'user-events',
  'user.updated': 'user-events',
  'transaction.created': 'financial-events',
  'transaction.updated': 'financial-events',
  'subsidy.application.submitted': 'subsidy-events',
  'insurance.quote.requested': 'insurance-events',
  'document.uploaded': 'document-events',
  'iot.sensor.data': 'iot-events',
  'notification.send': 'notification-events'
};

// Event publishing
class EventPublisher {
  constructor(private kafka: Kafka) {}

  async publish(topic: string, event: any): Promise<void> {
    const producer = this.kafka.producer();
    await producer.send({
      topic,
      messages: [{
        key: event.id,
        value: JSON.stringify(event),
        timestamp: Date.now().toString()
      }]
    });
    await producer.disconnect();
  }
}
```

### Event Handlers
```typescript
// Event consumer implementation
class EventConsumer {
  constructor(
    private kafka: Kafka,
    private eventHandlers: Map<string, EventHandler>
  ) {}

  async startConsuming(): Promise<void> {
    const consumer = this.kafka.consumer({ groupId: 'financial-service' });
    
    await consumer.subscribe({ topics: ['financial-events', 'user-events'] });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value?.toString() || '{}');
        const handler = this.eventHandlers.get(event.type);
        
        if (handler) {
          await handler.handle(event);
        }
      }
    });
  }
}
```

---

## Error Handling & Monitoring

### Structured Error Handling
```typescript
// Error types
class DaorsAgroError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends DaorsAgroError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details);
  }
}

class AuthenticationError extends DaorsAgroError {
  constructor(message: string = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', message, 401);
  }
}

// Global error handler
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  logger.error('Request failed', {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers
    }
  });

  if (err instanceof DaorsAgroError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Unknown error
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      requestId,
      timestamp: new Date().toISOString()
    }
  });
};
```

### Health Check Implementation
```typescript
// Health check service
class HealthCheckService {
  constructor(
    private dbConnection: any,
    private redisConnection: any,
    private kafkaConnection: any
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkKafka(),
      this.checkExternalAPIs()
    ]);

    const [db, redis, kafka, apis] = checks.map(result => 
      result.status === 'fulfilled' ? result.value : { status: 'unhealthy', error: result.reason }
    );

    const overallStatus = [db, redis, kafka, apis].every(check => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      checks: { database: db, redis, kafka, externalAPIs: apis }
    };
  }
}
```

---

## Security Implementation

### JWT Configuration
```typescript
// JWT service
class JWTService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string = '15m';
  private readonly refreshTokenExpiry: string = '7d';

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET!;
  }

  generateTokenPair(payload: TokenPayload): TokenPair {
    const accessToken = jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256'
    });

    const refreshToken = jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256'
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.accessTokenSecret) as TokenPayload;
  }
}
```

### Input Validation
```typescript
// Validation schemas using Joi
const transactionSchema = Joi.object({
  amount: Joi.number().precision(2).positive().required(),
  description: Joi.string().max(500).required(),
  categoryId: Joi.string().uuid().required(),
  transactionDate: Joi.date().max('now').required(),
  transactionType: Joi.string().valid('income', 'expense').required(),
  farmId: Joi.string().uuid().required()
});

// Validation middleware
const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      throw new ValidationError('Invalid input data', {
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req.body = value;
    next();
  };
};
```

---

This backend specification provides the foundation for building a robust, scalable, and secure agricultural financial management platform. Each service should be developed following these specifications while maintaining consistency across the entire system.