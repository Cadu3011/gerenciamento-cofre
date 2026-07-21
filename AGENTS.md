# AGENTS.md

## Structure

Two independent packages (no monorepo tooling, no root `package.json`):

- **`api/`** — NestJS backend (TypeScript, Prisma ORM, MySQL)
- **`web/`** — Next.js 16 frontend (App Router, Tailwind CSS, React 19, shadcn/ui)

Each has its own `package.json` and `package-lock.json`. Install dependencies separately in each directory.

## Commands

### API (`api/`)

```bash
npm install
npx prisma generate             # run after install or schema changes
npx prisma migrate dev          # run migrations (requires DATABASE_URL)
npm run start:dev               # dev server on port 4000
npm run build && npm run start:prod  # production (PM2: pm2 start ecosystem.config.js)
npm run test                    # unit tests (Jest, files: *.spec.ts in src/)
npm run test:e2e                # e2e tests (jest-e2e.json config)
npm run lint                    # ESLint + fix
npm run format                  # Prettier
```

### Web (`web/`)

```bash
npm install
npm run dev                     # dev server on port 5000
npm run build                   # production build
npm run lint                    # next lint
```

## Ports & Reverse Proxy

| Service | Dev Port | Production Proxy (Nginx) |
|---------|----------|--------------------------|
| Web     | 5000     | localhost:3000 → `/`      |
| API     | 4000     | localhost:3000 → `/api`   |
| Socket.IO | 4000   | localhost:3000 → `/socket.io/` |

Nginx config is documented in `api/README.md`. The web frontend calls the API through Nginx in production.

**CORS gotcha**: `api/src/main.ts` sets CORS origin to `http://localhost:3000` only. In local dev, the web frontend on port 5000 will be blocked when calling the API on port 4000 directly. Either use Nginx (port 3000) for all local dev, or temporarily add `http://localhost:5000` to the CORS origins.

## Environment Variables

**API** (required, in `api/.env`):
- `DATABASE_URL` — MySQL connection string
- `SECRET_KEY` — JWT signing secret (used by `@nestjs/jwt`)

**Web** (required, in `web/.env`):
- `JWT_SECRET` — JWT verification secret (must match API's `SECRET_KEY`)

`.env` files exist locally but are gitignored. Check with the team for local setup values.

## Database

- **ORM**: Prisma (`api/prisma/schema.prisma`)
- **Production**: MySQL
- **Local dev**: `api/prisma/dev.db` exists (SQLite) with `sqlite3` in dependencies — confirm with team which provider to use locally
- After schema changes: `npx prisma migrate dev` then `npx prisma generate`

## Auth

- JWT-based: API issues tokens via `AuthModule`, web verifies in `web/src/proxy.ts` middleware
- **Dual token transport**: Web middleware reads from `access_token` cookie; API endpoints expect `Authorization: Bearer <token>` header
- Token stored in `access_token` cookie by the frontend
- Routes `/admin/*` and `/workspace/*` require valid JWT (enforced by `web/src/proxy.ts`)
- `/admin/*` routes additionally require `GESTOR` role (checked in proxy and via `@Roles()` decorator in API)
- Token expiry: 3600s (set in `api/src/auth/auth.module.ts`)
- JWT payload: `{ sub, roles, filialId }` — OPERADOR tokens also include `cofreIdTrier` and `tokenTrier`

## Testing

- Unit tests: `*.spec.ts` files co-located with source in `api/src/`
- E2e tests: `api/test/*.e2e-spec.ts`
- Playwright is in devDependencies but no config found — may be unused or WIP

## Code Style

- **API**: Prettier with single quotes, trailing commas. ESLint with `@typescript-eslint/no-explicit-any` OFF, `prettier/prettier` OFF.
- **Web**: Standard Next.js/TypeScript conventions.
- Language throughout is Portuguese (pt-BR) for domain terms, UI text, and variable names.

## Architecture Notes

- **Cron jobs**: NestJS `@nestjs/schedule` runs automated card reconciliation (`ConciliacaoModule`)
- **Real-time**: Socket.IO for live updates (`JobsGateway` in `api/src/jobs/`)
- **Card integrations**: Trier, Rede, Cielo — each has its own module under `api/src/`
- **PM2**: API production deployment via `api/ecosystem.config.js` (app name: `apiCofre`)
- **Key modules**: `conciliacao` (reconciliation engine), `cardETL`/`parcETL` (card data ETL), `trier`/`rede`/`cielo` (card provider integrations)
- **Prisma schema enums**: `Role` (GESTOR, OPERADOR), `StatusConciliacao`, `Category`, `ParcelStatus`, `ReceivableStatus`, `MatchType`

## Gotchas

- `api/prisma/schema.prisma` declares MySQL but `sqlite3` + `dev.db` exist — verify DATABASE_URL provider before running migrations
- `conciliacao.service copy.ts` exists (backup/leftover file) — ignore it
- No CI/CD config found in repo — deployment process is manual (PM2 + Nginx)
- The `web/next.config.ts` allows CORS origins `localhost:3000` and `177.200.115.10:3000` for server actions
- The API guard (`api/src/auth/auth.guard.ts`) skips **all** auth (JWT verification + role check) on routes without `@Roles()` — only decorated routes are protected
