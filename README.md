# next-nest-casl-monorepo

A full-stack monorepo template using Next.js and NestJS, managed with Turborepo and pnpm workspaces.

## Stack

| Layer        | Technology                                       |
| ------------ | ------------------------------------------------ |
| Frontend     | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| Backend      | NestJS 10, Prisma 7 (SQL Server)                 |
| Auth         | CASL (ability-based authorization)               |
| Monorepo     | Turborepo, pnpm workspaces                       |
| Language     | TypeScript (strict, shared config)               |
| Testing      | Jest, ts-jest                                    |
| Code quality | ESLint, Prettier, Lefthook (pre-commit)          |

## Structure

```
apps/
  web/          Next.js frontend
  server/       NestJS backend

packages/
  db/           Prisma client + SQL Server adapter (@repo/db)
  auth/         CASL ability definitions (@repo/auth)
  types/        Shared TypeScript interfaces (@repo/types)
  eslint-config/     Shared ESLint config
  typescript-config/ Shared tsconfig presets
```

## Getting started

```bash
pnpm install
pnpm dev          # starts all apps in parallel
```

## Common commands

```bash
pnpm build        # build all packages and apps
pnpm lint         # lint all workspaces
pnpm test         # run all unit tests
pnpm format       # format all files with Prettier
```

## Backend conventions

- **Repository pattern** — data access is isolated in `*.repository.ts` classes; services contain only business logic.
- **Path alias** — `@/` maps to `apps/server/src/`.
- **Unit tests** — specs live in `apps/server/test/<module>/`, not alongside source files.
- **TDD** — tests are written before implementation; mocks are applied only at true boundaries (repository, external APIs).

## Pre-commit hooks

Lefthook runs three checks in parallel on every commit:

- **lint** — ESLint across all workspaces (via turbo)
- **format** — Prettier on staged files, re-staged automatically
- **test** — full unit test suite (via turbo, with caching)

## Database

SQL Server via Prisma. Configure connection in `apps/server/.env`:

```env
DB_HOST=localhost
DB_PORT=1433
DB_NAME=mydb
DB_USER=sa
DB_PASSWORD=yourpassword
DB_ENCRYPT=true
DB_TRUST_SERVER_CERT=true
```
