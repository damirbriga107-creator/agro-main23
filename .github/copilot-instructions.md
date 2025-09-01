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

## How to run (dev)

- From the repository root (PowerShell), recommended sequence:

```powershell
# 1) Verify Node & npm
node -v; npm -v

# 2) Install root deps
cd C:\Users\User\Downloads\agro-main
npm install

# 3) Install service/frontend deps (optional but faster to run once)
npm --prefix backend/api-gateway install
npm --prefix frontend-app install

# 4) Start development servers (root script runs both in parallel)
npm run dev
```

- If you prefer to run components separately (debugging):

```powershell
# Start the API Gateway (in its folder)
cd backend\api-gateway
npm run dev   # runs nodemon src/index.ts

# Start the frontend (in its folder)
cd ..\..\frontend-app
npm run dev   # runs vite
```

- Common issues and fixes:
	- "npx canceled" or interactive prompts: run `npm install` first and retry `npx vite` / `npx nodemon`.
	- Port conflicts: frontend defaults to Vite port 5173, API gateway to 3000. Use `env PORT=` or edit service config.
	- Missing workspace scripts: some commands use `--workspace`; ensure Node/npm versions meet `package.json` `engines`.
	- Permission/Windows path issues: use PowerShell native commands (escape paths) and run the shell as admin if required.

- Where to look for logs:
	- Frontend: terminal running Vite; also check `frontend-app/dist` after `npm run build`.
	- Backend: `backend/api-gateway` console (nodemon) and `logs/` if services write to files (see `winston` config).
