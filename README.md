# Job Search Automation Tool

Monorepo built with **pnpm workspaces** + **Turborepo**.

| App | Path | Stack | Dev URL |
|-----|------|-------|---------|
| front | `apps/front` | React + Vite + TypeScript | http://localhost:5173 |
| back | `apps/back` | NestJS + TypeScript | http://localhost:3000 |

## Requirements

- Node.js 22+
- pnpm 10 (`corepack enable` or `npm i -g pnpm`)

## Commands (run from the repo root)

```bash
pnpm install   # install deps for all apps
pnpm dev       # start front and back in watch mode
pnpm build     # build all apps
pnpm lint      # lint all apps
```

Run a command for one app only: `pnpm --filter back dev`.
