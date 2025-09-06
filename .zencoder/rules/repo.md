# DaorsAgro Platform Repository Information

## Project Overview
DaorsAgro is a comprehensive agricultural financial management platform built with microservices architecture using TypeScript, Node.js, and React.

## Key Technologies
- **Backend**: Node.js, TypeScript, Express.js, Prisma ORM
- **Frontend**: React 18+, TypeScript, Vite, Tailwind CSS
- **Databases**: PostgreSQL, MongoDB, Redis
- **Authentication**: JWT with refresh tokens
- **Architecture**: Microservices with API Gateway

## Repository Structure
- `backend/services/`: Core microservices (auth, financial, subsidy, insurance, analytics, document, notification, IoT)
- `backend/api-gateway/`: Central API Gateway with routing and proxy
- `backend/shared/`: Shared types, utilities, and database configs
- `frontend-app/`: Modern React PWA with Vite
- `daorsagro-frontend/`: Additional React frontend
- `infrastructure/`: Docker, Kubernetes, monitoring configs
- `scripts/`: Automation and deployment scripts

## Development Commands
- Install: `npm install` (root), then service-specific installs
- Dev: `npm run dev` (runs both API gateway and frontend)
- Type checking: `npx tsc --noEmit` in each service
- Build: `npm run build`
- Tests: `npm run test`

## Common Patterns
- All services use TypeScript with strict type checking
- Services expose `/health` endpoints
- API Gateway handles authentication and routing
- Shared types in `backend/shared/types`
- JWT-based authentication with RBAC
- Consistent error handling with request IDs

## Current Status
- Core services: auth, financial, subsidy, insurance, analytics
- Frontend: React PWA with modern features
- Infrastructure: Docker, Kubernetes ready
- In active development with ongoing TypeScript migrations