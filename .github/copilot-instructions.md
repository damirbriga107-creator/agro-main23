# Copilot Instructions for DaorsAgro Platform

## Project Overview
- **DaorsAgro** is a microservices-based agricultural financial management platform.
- Major backend services: authentication, financial, subsidy, insurance, analytics, document, notification, and IoT integration.
- Frontend: React (PWA), React Native (mobile), and an admin dashboard.
- Data flows through an API Gateway, with services communicating via REST and message queues (Kafka/Redis).

## Key Directories
- `backend/services/`: All core microservices (auth, financial, subsidy, etc.)
- `backend/api-gateway/`: Entry point for all API traffic; handles routing and aggregation.
- `backend/shared/`: Shared types, utilities, and configs for backend services.
- `daorsagro-frontend/` and `frontend-app/`: React-based frontend apps.
- `infrastructure/`: Docker, database, and monitoring configs.
- `scripts/`: Automation for setup, health checks, and database tasks.

## Developer Workflows
- **Install all dependencies:** `npm run install:all`
- **Start all services (dev):** `npm run docker:up` then `npm run dev`
- **Run tests:** `npm run test` (see README for service-specific and E2E options)
- **Build all packages:** `npm run build`
- **Lint/format:** `npm run lint` / `npm run format`
- **Database migrations:** `npm run db:migrate` / `npm run db:seed`
- **Stop services:** `npm run docker:down`

## Patterns & Conventions
- **TypeScript** is used throughout backend and frontend.
- **Service boundaries** are strict: each service has its own folder, Dockerfile, and (if needed) database schema.
- **Shared code** (types, utils) lives in `backend/shared/` and is imported by services.
- **Environment variables** are required for secrets, DB connections, and service configs (see `.env.example` in each service).
- **Testing:** Unit, integration, and E2E tests are required; >80% coverage is enforced.
- **Security:** JWT auth, RBAC, input validation, and encryption are standard.

## Integration Points
- **API Gateway**: All client and service requests go through `backend/api-gateway`.
- **Message Queues**: Kafka/Redis for async service communication.
- **IoT**: Integrates via ThingsBoard/MQTT (see `iot-service`).
- **Monitoring**: Prometheus and Grafana (see `infrastructure/monitoring/`).

## Examples
- To add a new service: copy an existing service in `backend/services/`, update its `Dockerfile`, and register it in the API Gateway.
- To share types: add to `backend/shared/types/` and import in services.
- To run only the auth service tests: `npm run test --workspace=backend/services/auth-service`

## References
- See `README.md` in the root and in each major directory for more details.
- Architecture diagram: `agro-main/daorsagro_architecture.png`
- For onboarding, see `Backend-Specifications.md` and `Frontend-Specifications.md`.
