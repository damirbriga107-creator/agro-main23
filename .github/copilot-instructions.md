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

## Service discovery, metrics, logging, and error handling (examples)

- Service discovery (`backend/api-gateway/src/services/service-discovery.service.ts`):
	- Maintains a map of known services with circuit-breaker states.
	- Calls `/health` on each service on an interval and records `responseTime`, `errorCount`, and `consecutiveErrors`.
	- Opens a circuit after `FAILURE_THRESHOLD` consecutive failures and skips health checks until `nextAttempt`.
	- Use `ServiceDiscoveryService.recordServiceCall(serviceName, success, responseTime)` when recording proxy results.

- Metrics (`backend/api-gateway/src/services/metrics.service.ts`):
	- Collects request-level and per-service metrics: total requests, success/fail counts, average response time, error rate.
	- Exposes `getMetrics()` and `getPrometheusMetrics()` for dashboards and Prometheus scraping.
	- Agents modifying proxy logic should update `MetricsService.recordRequest` and `recordServiceResponse` calls accordingly.

- Logging (`backend/api-gateway/src/utils/logger.ts`):
	- Uses Winston with JSON output in production and colorized/simple format in development.
	- Prefer `logger.info/warn/error` with structured metadata; use `Logger.sanitize` to avoid logging secrets.
	- Use `Logger.createMiddleware(logger)` for request logging in new routes.

- Error handling (`backend/api-gateway/src/middleware/error-handler.middleware.ts`):
	- Centralized error-to-HTTP mapping for validation, auth, DB, Redis, file upload, and timeout errors.
	- Use `ErrorHandlerMiddleware.asyncWrapper` when adding async route handlers to automatically forward errors to the handler.
	- Errors logged include `requestId`; downstream services should preserve `X-Request-ID` for traceability.

Agent editing guidance:
	- When adding a new downstream service, register it in `service-discovery.service.ts` and in the `services` map in `index.ts`.
	- When changing proxy behavior, ensure `serviceDiscovery.recordServiceCall(...)` and `metricsService.recordServiceResponse(...)` are called with accurate `success` flags and timings.
	- Follow existing error codes and shapes (see `ErrorHandlerMiddleware`) so clients get consistent error payloads.

## Adding a new microservice — checklist
Follow this checklist when introducing a new backend service so AI agents and humans have a predictable, repeatable process.

1. Create the service scaffold
	- Duplicate an existing service folder under `backend/services/` (e.g., `auth-service`) and update `package.json`, `Dockerfile`, and `src/`.
	- Add `tsconfig.json` and `prisma/` only if the service requires a DB schema.

2. Add environment variables
	- Add `NEW_SERVICE_URL` to the deployment and `.env.example` if needed.
	- Update `infrastructure/*` or `docker-compose.yml` to include the service and exposed ports.

3. Register the service in the API Gateway
	- Add an entry to the `services` map in `backend/api-gateway/src/index.ts` with `target`, `paths`, `pathRewrite`, and `publicPaths`.
	- Add the service to `backend/api-gateway/src/services/service-discovery.service.ts` `serviceConfigs` list.

4. Implement health & readiness
	- Add `/health` endpoint returning `{ status: 'healthy' }` and ensure it responds quickly (<5s).
	- If the service depends on DBs, ensure the health check verifies DB connectivity.

5. Metrics and logging
	- Ensure requests/responses include `X-Request-ID` and propagate `Authorization` header.
	- Call `MetricsService.recordServiceResponse(serviceName, statusCode, responseTime)` through the gateway (gateway handles this automatically if proxied).
	- Use `Logger` for structured logs and `Logger.sanitize` before emitting any request/response bodies.

6. Error contract and tests
	- Follow `ErrorHandlerMiddleware` shapes: { error: { code, message, timestamp, requestId } }.
	- Add unit tests for auth, routing, and error cases; add integration tests under `tests/` that hit the gateway's proxied path.

7. CI and build
	- Add the service to root `npm run build` and `npm run test` workspaces if using workspaces.
	- Add Docker build steps to `docker-compose.yml` and `npm run docker:build` if required.

8. Smoke test locally
	- Start the service (or use `npm run docker:up`) and confirm: `curl -v http://localhost:<gateway-port>/api/v1/<service>/health` returns 200 and includes `X-Service-Name` header.

9. Documentation
	- Update `docs/` with the service description and API endpoints.
	- Add environment variable documentation to the repo-level README and service-level README.

Agent note: run `npm run test --workspace=backend/services/<new-service>` for service-level tests and `npm run test` to run the integration suite after registration.



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

## API Gateway: proxy patterns (concrete examples)

- The API Gateway (`backend/api-gateway/src/index.ts`) uses `http-proxy-middleware` to forward requests to backend services. Key behaviors to surface for code-editing agents:
	- Services are configured in a `services` map with `target`, `paths`, and `publicPaths` (see `auth`, `financial`, `subsidies`, etc.).
	- Protected paths are wrapped with `AuthMiddleware.authenticate` before the proxy. Public paths (e.g., `/api/v1/auth/login`) are proxied without auth.
	- Proxies add or forward headers: `X-Forwarded-For`, `X-Gateway-Version`, `X-Request-ID`, and forward `Authorization` if present.
	- When a user context is present (`req.user`), the gateway forwards `X-User-ID` and `X-User-Role` to downstream services.
	- Errors in proxying return a consistent 503 JSON payload with `SERVICE_UNAVAILABLE` and the `requestId` for tracing.
	- On responses, the gateway appends `X-Service-Name` and `X-Gateway-Version` to upstream responses and records metrics via `MetricsService` and `ServiceDiscoveryService`.

- Quick code snippet agents should mirror when touching proxy logic (pseudocode):

	- Use `createProxyMiddleware({ target, changeOrigin: true, pathRewrite, onProxyReq, onProxyRes, onError })`.
	- Ensure `AuthMiddleware` is applied only to protected routes.

- Files to inspect for related patterns:
	- `backend/api-gateway/src/middleware/auth.middleware.ts` — token verification and role checks.
	- `backend/api-gateway/src/utils/logger.ts` — structured logging conventions.
	- `backend/api-gateway/src/services/service-discovery.service.ts` — how service health and call metrics are recorded.

> Agent note: when adding new service proxies, register the service in the `services` map in `index.ts`, add any `publicPaths`, and ensure you update service discovery and environment variable names (e.g., `NEW_SERVICE_URL`).
