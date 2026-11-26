# Project context: Job Search Automation Tool

Read this file before you read or write a specification. It describes the project and the code. `specs/` holds the current requirements of each capability.
For the Claude tools of this repository, read [`../docs/claude-code-tools-setup.md`](/docs/claude-code-tools-setup.md).

## 1. Product

Job Search Automation Tool keeps a person informed about the latest vacancies on different job aggregator platforms.
It saves information about companies and HR contacts. It also helps to find people on LinkedIn.

The code is a starting skeleton: no feature of the product exists yet.

## 2. Stack

| Part                  | Technology                                                                |
| --------------------- | ------------------------------------------------------------------------- |
| Monorepo              | pnpm 10 workspaces + Turborepo 2                                          |
| Back app              | NestJS 12 on Express, ES modules (`"type": "module"`), port 3000 (`PORT`) |
| Front app             | Next.js 16 (App Router) + React 19 + Tailwind CSS 4, port 3001            |
| Language              | TypeScript, `strict` (`tsconfig.base.json`)                               |
| Back unit tests       | Vitest 4 (`vitest.config.ts`)                                             |
| Back end-to-end tests | Vitest 4 + supertest (`vitest.config.e2e.ts`)                             |
| Front tests           | None yet                                                                  |
| Lint                  | oxlint (back), ESLint 9 with `eslint-config-next` (front)                 |
| Format                | Prettier (back: single quotes, trailing commas)                           |
| Shared types          | `@repo/shared` in `packages/shared`, built with `tsc` to `dist/`          |
| Database              | None yet                                                                  |

## 3. Repository map

| Path                          | Content                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/back/src/main.ts`       | Bootstrap. Reads `PORT` and logs the URL.                                                  |
| `apps/back/src/app.module.ts` | Root module. Imports all feature modules.                                                  |
| `apps/back/src/<name>/`       | Feature modules (NEW when the first module comes): controller, service, module, spec files |
| `apps/back/src/common/`       | Code that all back modules use: errors, filters, interceptors                              |
| `apps/back/test/`             | End-to-end tests (`*.e2e-spec.ts`)                                                         |
| `apps/front/src/app/`         | App Router: `layout.tsx`, `page.tsx`, `globals.css`, one folder for each route             |
| `apps/front/public/`          | Static files                                                                               |
| `packages/shared/src/`        | Interfaces and types that the back app and the front app both use (`@repo/shared`)         |
| `openspec/`                   | Specifications (`README.md` gives the process)                                             |
| `docs/`                       | Docs for developers                                                                        |

### Shared package (`packages/shared`)

`@repo/shared` holds the interfaces of the data that goes between the back app and the front app: request bodies, response bodies, error bodies.

- Put a type in `@repo/shared` only when both apps use it. A type for one app stays in that app.
- Write one file for each topic in `packages/shared/src/`, for example `vacancy.ts`.
- Export each file from `packages/shared/src/index.ts`. Write the `.js` extension: `export type { Vacancy } from './vacancy.js'`.
- Import with `import type { Vacancy } from '@repo/shared'` in both apps. Do not import from a file path such as `@repo/shared/src/...`.
- The package compiles to `dist/`, and both apps read `dist/`. `turbo.json` builds it before `build` and `dev` (`dependsOn: ["^build"]`). `pnpm dev` also runs `tsc --watch` on it.
- After you add the package to a new app, add `"@repo/shared": "workspace:*"` to the `dependencies` of that app and run `pnpm install`.
- Put only types and interfaces in the package for now. A value (an `enum`, a constant, a function) also works, because the package compiles to JavaScript, but a change must give the reason in `design.md`.
- `error-codes.ts` and `http-status-messages.ts` hold values: `ERROR_TABLE`, `ErrorCodes`, `CODE_BY_STATUS`, `isErrorCode()` and `HTTP_STATUS_MESSAGES` (change `261124-0853`, EH1, EH2).
- The Vitest configs of the back app point `@repo/shared` to `packages/shared/src/index.ts`, so the back tests need no build of the package.

## 4. Anatomy of a back module

The back app has no feature module yet. The first change that adds one follows this table. Update this section when a change adds a new kind of part (for example an entity or a DTO).

| Part       | Location                                                                   | Notes                                    |
| ---------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| Module     | `apps/back/src/<name>/<name>.module.ts`                                    | Declares the controller and the service. |
| Controller | `apps/back/src/<name>/<name>.controller.ts`                                | The routes of the module.                |
| Service    | `apps/back/src/<name>/<name>.service.ts`                                   | The logic. The controller calls it.      |
| Unit tests | `apps/back/src/<name>/<name>.service.spec.ts`, `<name>.controller.spec.ts` | Next to the code (§7).                   |

### Registration steps

| New item                    | Register it in                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Module                      | `apps/back/src/app.module.ts` (`imports`)                                                   |
| Global exception filter     | `apps/back/src/app.module.ts` (`providers`: `APP_FILTER`, `ERROR_HANDLERS`, `ERROR_LOGGER`) |
| Global response interceptor | `apps/back/src/app.module.ts` (`providers`: `APP_INTERCEPTOR`)                              |

## 5. Front registration steps

| New item                   | Register it in                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Page (route)               | A folder `apps/front/src/app/<route>/` with `page.tsx`. The folder name is the URL path. |
| Layout of a group of pages | `layout.tsx` in the folder of the group                                                  |

## 6. Conventions

| Topic                       | Convention                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imports in the back app     | ES modules with `nodenext` resolution: write the `.js` extension in relative imports, for example `import { AppService } from './app.service.js'`.                                                                                                                                                                                                                    |
| Path alias in the front app | `@/*` is `apps/front/src/*`.                                                                                                                                                                                                                                                                                                                                          |
| Shared interfaces           | `import type { ... } from '@repo/shared'` in both apps (§3 "Shared package").                                                                                                                                                                                                                                                                                         |
| Commits                     | Conventional Commits `type(scope): description` (`README.md` "Commit Standards"). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`. Scopes: `front`, `back`, `openspec`, `root`. Add `(openspec <id>)` at the end of the subject when the commit belongs to a change.                                                                         |
| Branches                    | The work branch is `development`. `main` is the release branch. A pull request merges `development` into `main`. Other branches are `type/short-description`: `feature/`, `bugfix/`, `hotfix/`, `refactor/`, `docs/` (`README.md` "Git Branching Convention").                                                                                                        |
| Line endings                | LF (`.gitattributes`: `* text=auto eol=lf`).                                                                                                                                                                                                                                                                                                                          |
| Errors                      | Throw `CustomException` with a code of `ErrorCodes`, for example `throw new CustomException(ErrorCodes.RESOURCE_NOT_FOUND, 'Vacancy 42 not found')`. Add a new code to `ERROR_TABLE`. Write a 4xx message for the customer, with no internal details. A promise with no `await` gets `.catch((e) => logError(toAppError(e, { source: 'job', location: '<name>' })))`. |

## 7. Unit tests

- Back spec files are next to the code: `<name>.service.spec.ts`, `<name>.controller.spec.ts`.
- Vitest runs with `globals: true`: `describe`, `it`, `expect` and `vi` need no import.
- Build a Nest testing module with `Test.createTestingModule({ ... }).compile()` from `@nestjs/testing`. Mock a dependency with `vi.fn()`.
- End-to-end tests start the full `AppModule` and send HTTP requests with supertest.
- The front app has no test runner yet. The first change with a front scenario adds one (`README.md` §7).

## 8. Commands

Run the commands from the repository root.

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` and `pnpm --filter back dev` run the back app with `NODE_ENV=development`, so an error response has the debug fields.

```bash
pnpm --filter back dev
```

```bash
pnpm --filter front dev
```

```bash
pnpm build
```

```bash
pnpm lint
```

```bash
pnpm --filter back test
```

```bash
pnpm --filter back test app.controller
```

```bash
pnpm --filter back test:e2e
```

## 9. Known issues

Write a bug here when you find it and no change fixes it yet. Remove the row when a change fixes it.

| Issue | Location |
| ----- | -------- |
| –     | –        |
