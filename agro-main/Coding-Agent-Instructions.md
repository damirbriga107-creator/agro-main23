# DaorsAgro - Coding Agent General Instructions

## Project Overview
**DaorsAgro** is an enterprise-grade agricultural financial management platform built with modern microservices architecture. This document provides comprehensive coding standards and guidelines for all development agents working on the project.

---

## General Coding Standards

### Code Style & Formatting
- **Language**: TypeScript for all JavaScript code (Frontend & Backend)
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with strict TypeScript rules
- **Line Length**: Maximum 100 characters
- **File Naming**: kebab-case for files, PascalCase for components
- **Variable Naming**: camelCase for variables and functions, PascalCase for classes and types

### Code Structure Principles
- **DRY (Don't Repeat Yourself)**: Abstract common functionality into utilities
- **SOLID Principles**: Follow single responsibility, open/closed, Liskov substitution, interface segregation, and dependency inversion
- **Clean Code**: Write self-documenting code with meaningful names
- **Separation of Concerns**: Keep business logic separate from presentation logic

---

## Project Architecture Guidelines

### Microservices Design Patterns
- **Single Responsibility**: Each service handles one business domain
- **Database per Service**: No shared databases between services
- **API-First Design**: All services communicate via well-defined APIs
- **Event-Driven Architecture**: Use message queues for asynchronous communication
- **Circuit Breaker Pattern**: Implement fault tolerance for external service calls

### Directory Structure Standard
```
daorsagro/
├── frontend/
│   ├── web-app/          # React PWA
│   ├── mobile-app/       # React Native
│   └── shared/           # Shared components and utilities
├── backend/
│   ├── services/
│   │   ├── auth-service/
│   │   ├── financial-service/
│   │   ├── subsidy-service/
│   │   ├── insurance-service/
│   │   ├── analytics-service/
│   │   ├── document-service/
│   │   └── notification-service/
│   ├── shared/           # Shared libraries and utilities
│   └── api-gateway/
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   └── terraform/
├── docs/
└── scripts/
```

---

## Development Standards

### Git Workflow
- **Branch Naming**: `feature/DA-123-feature-name`, `bugfix/DA-456-bug-description`
- **Commit Messages**: Follow Conventional Commits format
  ```
  type(scope): description
  
  feat(auth): add JWT token refresh mechanism
  fix(financial): resolve decimal precision in calculations
  docs(api): update OpenAPI specifications
  ```
- **Pull Requests**: Require code review from at least 2 developers
- **Protected Branches**: main, develop, release/* branches require PR approval

### Testing Requirements
- **Unit Tests**: Minimum 80% code coverage for all services
- **Integration Tests**: Test API endpoints and service interactions
- **End-to-End Tests**: Critical user workflows must be covered
- **Test Naming**: `should_returnExpectedResult_when_conditionMet()`

### Error Handling
- **Structured Errors**: Use consistent error response format
  ```typescript
  interface ErrorResponse {
    error: {
      code: string;
      message: string;
      details?: any;
      timestamp: string;
      requestId: string;
    }
  }
  ```
- **HTTP Status Codes**: Use appropriate status codes (200, 201, 400, 401, 404, 500)
- **Logging**: Use structured logging with correlation IDs
- **Graceful Degradation**: Handle failures without crashing

---

## Security Guidelines

### Authentication & Authorization
- **JWT Tokens**: Use RS256 algorithm with rotating keys
- **Token Expiry**: Access tokens expire in 15 minutes, refresh tokens in 7 days
- **RBAC**: Implement role-based access control with granular permissions
- **API Security**: All endpoints must validate authentication and authorization

### Data Protection
- **Data Encryption**: 
  - At Rest: AES-256 encryption for sensitive data
  - In Transit: TLS 1.3 for all communications
- **PII Handling**: Mask sensitive data in logs and responses
- **Input Validation**: Validate and sanitize all user inputs
- **SQL Injection Prevention**: Use parameterized queries and ORM

### Security Headers
```typescript
// Required security headers for all responses
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

---

## API Development Standards

### RESTful API Design
- **Resource Naming**: Use plural nouns (`/api/v1/farms`, `/api/v1/expenses`)
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status Codes**: Return appropriate HTTP status codes
- **Versioning**: Use header versioning (`API-Version: v1`)

### Request/Response Format
```typescript
// Request format
interface ApiRequest<T = any> {
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

// Response format
interface ApiResponse<T = any> {
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
```

### Pagination Standard
```typescript
interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## Database Guidelines

### Data Modeling
- **Normalization**: Use 3NF for transactional data
- **Denormalization**: Allowed for read-heavy analytics data
- **Indexing**: Create indexes for all query patterns
- **Constraints**: Use database constraints for data integrity

### SQL Standards
```sql
-- Table naming: plural, snake_case
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id),
  amount DECIMAL(12,2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  category_id UUID REFERENCES transaction_categories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index naming: idx_table_column(s)
CREATE INDEX idx_financial_transactions_farm_id ON financial_transactions(farm_id);
CREATE INDEX idx_financial_transactions_created_at ON financial_transactions(created_at);
```

### MongoDB Collections
```typescript
// Document structure
interface FinancialDocument {
  _id: ObjectId;
  farmId: string;
  documentType: 'receipt' | 'invoice' | 'contract';
  fileName: string;
  fileUrl: string;
  extractedData?: {
    amount?: number;
    date?: Date;
    vendor?: string;
    category?: string;
  };
  uploadedAt: Date;
  processedAt?: Date;
  tags: string[];
}
```

---

## Frontend Development Guidelines

### Component Standards
```typescript
// Functional components with TypeScript
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
  loading?: boolean;
}

const FinancialForm: React.FC<Props> = ({ title, onSubmit, loading = false }) => {
  // Component implementation
};

export default FinancialForm;
```

### State Management
- **Redux Toolkit**: Use for global application state
- **React Query**: Use for server state management
- **Local State**: Use useState for component-specific state
- **Form State**: Use React Hook Form for form management

### Performance Guidelines
- **Code Splitting**: Lazy load routes and heavy components
- **Memoization**: Use React.memo, useMemo, useCallback appropriately
- **Bundle Size**: Monitor and optimize bundle size
- **Image Optimization**: Use WebP format, lazy loading

---

## Backend Development Guidelines

### Service Structure
```typescript
// Service class structure
class FinancialService {
  constructor(
    private readonly repository: FinancialRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly logger: Logger
  ) {}

  async createTransaction(data: CreateTransactionDto): Promise<Transaction> {
    try {
      // Business logic implementation
      const transaction = await this.repository.create(data);
      await this.eventPublisher.publish('transaction.created', transaction);
      return transaction;
    } catch (error) {
      this.logger.error('Failed to create transaction', { error, data });
      throw new BusinessError('TRANSACTION_CREATION_FAILED', error.message);
    }
  }
}
```

### Dependency Injection
```typescript
// Use dependency injection container
import { container } from 'tsyringe';

@injectable()
class FinancialController {
  constructor(
    @inject('FinancialService') private readonly financialService: FinancialService,
    @inject('Logger') private readonly logger: Logger
  ) {}
}
```

### Environment Configuration
```typescript
// Environment configuration schema
interface Config {
  server: {
    port: number;
    host: string;
  };
  database: {
    url: string;
    poolSize: number;
  };
  redis: {
    url: string;
    ttl: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// Validate configuration on startup
const config = validateConfig(process.env);
```

---

## IoT Integration Guidelines

### Device Communication
```typescript
// IoT device message format
interface IoTMessage {
  deviceId: string;
  timestamp: number;
  messageType: 'sensor_data' | 'status' | 'alarm';
  payload: {
    [key: string]: any;
  };
  metadata?: {
    batteryLevel?: number;
    signalStrength?: number;
    firmwareVersion?: string;
  };
}

// MQTT topic structure
// daorsagro/{farmId}/devices/{deviceType}/{deviceId}/{messageType}
// Example: daorsagro/farm123/devices/soil-sensor/sensor001/sensor_data
```

### Data Processing Pipeline
1. **Ingestion**: MQTT broker receives device messages
2. **Validation**: Validate message format and device authentication
3. **Processing**: Transform and enrich sensor data
4. **Storage**: Store in time-series database
5. **Analytics**: Real-time analytics and alerting
6. **Notification**: Send alerts for critical events

---

## Monitoring & Observability

### Logging Standards
```typescript
// Structured logging format
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  requestId: string;
  userId?: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}
```

### Metrics Collection
- **Application Metrics**: Response time, error rate, throughput
- **Business Metrics**: User actions, feature usage, conversion rates
- **Infrastructure Metrics**: CPU, memory, disk, network usage
- **Custom Metrics**: Farm-specific KPIs and analytics

### Health Checks
```typescript
// Health check endpoint structure
interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  checks: {
    database: HealthStatus;
    redis: HealthStatus;
    externalApis: HealthStatus;
  };
}
```

---

## Performance Guidelines

### Backend Performance
- **Caching**: Implement Redis caching for frequently accessed data
- **Database Optimization**: Use connection pooling, query optimization
- **Async Processing**: Use queues for heavy computations
- **Rate Limiting**: Implement rate limiting to prevent abuse

### Frontend Performance
- **Lazy Loading**: Load components and routes on demand
- **Image Optimization**: Use appropriate formats and sizes
- **Bundle Splitting**: Split code by routes and features
- **Caching**: Implement service worker for offline capabilities

### Mobile Performance
- **Native Modules**: Use native modules for performance-critical features
- **Memory Management**: Optimize memory usage and prevent leaks
- **Network Optimization**: Minimize API calls and payload sizes
- **Battery Optimization**: Optimize background processing

---

## Deployment Guidelines

### Container Standards
```dockerfile
# Multi-stage build for Node.js services
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
USER node
CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
# Deployment configuration
apiVersion: apps/v1
kind: Deployment
metadata:
  name: financial-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: financial-service
  template:
    spec:
      containers:
      - name: financial-service
        image: daorsagro/financial-service:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Documentation Standards

### Code Documentation
- **JSDoc**: Use JSDoc comments for all public functions and classes
- **README**: Each service must have comprehensive README
- **API Documentation**: Maintain OpenAPI specifications
- **Architecture Documents**: Keep architecture decisions documented

### Comment Standards
```typescript
/**
 * Calculates the profitability of a crop season
 * @param farmId - The unique identifier of the farm
 * @param cropId - The unique identifier of the crop
 * @param season - The season year (e.g., 2024)
 * @returns Promise resolving to profitability analysis
 * @throws {BusinessError} When insufficient data is available
 */
async function calculateCropProfitability(
  farmId: string,
  cropId: string,
  season: number
): Promise<ProfitabilityAnalysis> {
  // Implementation
}
```

---

## Quality Assurance

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are comprehensive and passing
- [ ] Security best practices are followed
- [ ] Performance considerations are addressed
- [ ] Documentation is updated
- [ ] Error handling is appropriate
- [ ] Logging is implemented correctly

### Definition of Done
- [ ] Feature is implemented according to requirements
- [ ] Unit tests achieve 80%+ coverage
- [ ] Integration tests pass
- [ ] Code review is approved
- [ ] Documentation is updated
- [ ] Security review is completed
- [ ] Performance testing shows acceptable results
- [ ] Feature is deployed to staging environment

---

## Compliance & Regulations

### Data Privacy
- **GDPR Compliance**: Implement right to erasure, data portability
- **Data Minimization**: Collect only necessary data
- **Consent Management**: Clear consent mechanisms for data processing
- **Audit Trail**: Maintain logs of data access and modifications

### Agricultural Compliance
- **Regional Regulations**: Support different country/state regulations
- **Subsidy Compliance**: Ensure accurate subsidy calculation and reporting
- **Financial Reporting**: Support various financial reporting standards
- **Tax Compliance**: Generate tax-compliant reports and documents

---

## Emergency Procedures

### Incident Response
1. **Detection**: Automated alerting for critical issues
2. **Assessment**: Determine impact and severity
3. **Communication**: Notify stakeholders and users
4. **Mitigation**: Implement immediate fixes
5. **Recovery**: Restore full functionality
6. **Post-mortem**: Document lessons learned

### Rollback Procedures
- **Database Migrations**: Implement reversible migrations
- **Feature Flags**: Use feature toggles for quick rollbacks
- **Blue-Green Deployment**: Maintain parallel environments
- **Backup Strategy**: Regular automated backups with tested recovery

---

This document serves as the foundation for all development work on DaorsAgro. All developers must familiarize themselves with these guidelines and follow them consistently to ensure code quality, security, and maintainability.