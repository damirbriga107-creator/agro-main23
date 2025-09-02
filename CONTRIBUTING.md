Development flow (pnpm / npm workspaces) - DaorsAgro

This project uses a monorepo workspace layout. Use the root package manager (npm or pnpm) for workspace-level commands.

Quick setup
- Install dependencies at repo root: npm install
- Install only specific package deps: npm --prefix backend/api-gateway install

Run dev servers
- API Gateway (backend/api-gateway): npm --prefix backend/api-gateway run dev
- Frontend (frontend-app): npm --prefix frontend-app run dev
- Full dev (from root): npm run dev

TypeScript and ESM notes
- Root tsconfig targets ES2022 and emits ESNext modules by default. Some backend services (Node runtime) expect CommonJS.
- If you see ESM resolution warnings like "Cannot use import statement outside a module" or Node complaining about package.json "type": "module" mismatches, prefer one of these minimal fixes:
  1) Add "type": "module" to the specific package.json if the package and runtime fully support ESM.
  2) Or set the service's tsconfig "module" to "CommonJS" so compiled files run under Node without ESM flags. This repository sets backend/api-gateway/tsconfig.json to use CommonJS to avoid such warnings during development.

Tips
- Use "npm run type-check --workspace=backend/api-gateway" to run the gateway type-check.
- For editors that run tsserver, ensure the workspace `tsconfig.json` is used; prefer opening the repo root.
- If you change module systems, update package.json "type" or Node run flags consistently for that package.
