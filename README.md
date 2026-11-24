# Job Search Automation Tool

Job Search Automation Tool keeps people informed about the latest vacancies on different job aggregator platforms.
It saves information about companies and HR contacts, and it helps to find people on LinkedIn.

## 🚀 Technologies

- **[pnpm](https://pnpm.io/) workspaces + [Turborepo](https://turborepo.com/)** — monorepo and task runner.
- **[TypeScript](https://www.typescriptlang.org/)** — strict mode in all apps.
- **[Next.js](https://nextjs.org/) 16 + [React](https://react.dev/) 19** — front app (App Router).
- **[Tailwind CSS](https://tailwindcss.com/) 4** — styles of the front app.
- **[NestJS](https://docs.nestjs.com/) 12** — back app (API).
- **[Vitest](https://vitest.dev/) + [supertest](https://github.com/ladjs/supertest)** — unit and end-to-end tests of the back app.
- **[oxlint](https://oxc.rs/docs/guide/usage/linter.html), [ESLint](https://eslint.org/), [Prettier](https://prettier.io/)** — lint and format.

---

## 📂 Project Structure

| App    | Path              | Stack                                  | Dev URL               |
| ------ | ----------------- | -------------------------------------- | --------------------- |
| front  | `apps/front`      | Next.js + TypeScript + Tailwind CSS    | http://localhost:3001 |
| back   | `apps/back`       | NestJS + TypeScript                    | http://localhost:3000 |
| shared | `packages/shared` | TypeScript interfaces (`@repo/shared`) | –                     |

```text
job-search-automation-tool/
├── apps/
│   ├── back/             # NestJS application (API)
│   └── front/            # Next.js application (UI)
├── packages/
│   └── shared/           # @repo/shared: interfaces used by back and front
├── openspec/             # Specifications (spec-driven development)
│   ├── README.md         # The workflow: statuses, file templates, rules
│   ├── project.md        # Project context for specs and code
│   ├── specs/            # Current requirements of each capability
│   └── changes/          # Open changes; finished ones go to changes/archive/
├── docs/                 # Developer docs
├── CLAUDE.md             # Guide for Claude Code
└── turbo.json            # Turborepo tasks
```

### Shared interfaces

`packages/shared` (`@repo/shared`) holds the TypeScript interfaces that both apps use, for example the shape of an API response.

1. Add a file, for example `packages/shared/src/vacancy.ts`:

```ts
export interface Vacancy {
  id: string;
  title: string;
  company: string;
}
```

2. Export it from `packages/shared/src/index.ts` (keep the `.js` extension):

```ts
export type { Vacancy } from './vacancy.js';
```

3. Import it in the back app or the front app:

```ts
import type { Vacancy } from '@repo/shared';
```

`pnpm dev` and `pnpm build` compile the package first, so the apps see the new type. The rules are in [`openspec/project.md`](openspec/project.md) §3.

---

## 📐 Spec-Driven Development (SDD)

Each feature starts as a specification, not as code. The workflow is in [`openspec/README.md`](openspec/README.md).

1. The feature is split into changes. Each change is a folder `openspec/changes/<YYMMDD-HHMM>-<slug>/` with
   `proposal.md` (what and why), `tasks.md` (tests, then code, then checks), an optional `design.md`
   (technical decisions) and spec deltas (requirements with GIVEN / WHEN / THEN scenarios).
2. The developer reviews the change. Nothing is built while the status is `Draft`.
3. Unit tests come first and use the requirement and scenario names of the spec. They must fail before the code.
4. The code makes the tests pass.
5. The finished change is archived: its requirements go into `openspec/specs/`, the current truth of the system.

Status flow: `Draft` → `Reviewed` → `Tested` → `Implemented` → `Archived`.

---

## 🛠 Setup & Installation

Requirements:

- Node.js 22+
- pnpm 10 (`corepack enable` or `npm i -g pnpm`)

Install the dependencies of all apps (run from the repository root):

```bash
pnpm install
```

For the Claude Code tools of this repository, see [`docs/claude-code-tools-setup.md`](docs/claude-code-tools-setup.md).

---

## 🏃 Running the Project

Run the commands from the repository root.

- Run front and back in watch mode:

```bash
pnpm dev
```

- Run one app only:

```bash
pnpm --filter back dev
```

```bash
pnpm --filter front dev
```

- Build all apps:

```bash
pnpm build
```

- Lint all apps:

```bash
pnpm lint
```

- Format all Markdown files with Prettier:

```bash
pnpm format:md
```

- Test the back app (unit tests, then end-to-end tests):

```bash
pnpm --filter back test
```

```bash
pnpm --filter back test:e2e
```

---

## 🌿 Git Branching Convention

`development` is the work branch. `main` is the release branch. A pull request merges `development` into `main`.

Other branches follow a structured naming convention. Format: `type/short-description`

`feature/` — New functionality (e.g., `feature/vacancy-search`)

`bugfix/` — Bug fixes (e.g., `bugfix/fix-company-list`)

`hotfix/` — Critical production fixes (e.g., `hotfix/security-patch`)

`refactor/` — Code improvements without logic changes (e.g., `refactor/clean-search-service`)

`docs/` — Documentation updates (e.g., `docs/update-readme`)

---

## 📝 Commit Standards

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Since this is a
monorepo, always specify the scope (the app name or the area) when possible.

<b>Format</b>: `type(scope): description`

<b>Available Types:</b>

- `feat`: A new feature for the user.
- `fix`: A bug fix for the user.
- `docs`: Changes to the documentation.
- `style`: Formatting, missing semi-colons, etc; no production code change.
- `refactor`: Refactoring production code, e.g. renaming a variable.
- `test`: Adding missing tests, refactoring tests; no production code change.
- `chore`: Updating build tasks, dependencies etc; no production code change.
- `ci`: Changes to CI configuration files and scripts.

<b>Scopes:</b> `front`, `back`, `openspec` (specs and the SDD docs), `root` (root config and dependencies).

When a commit belongs to an OpenSpec change, add its ID at the end of the subject: `(openspec <id>)`.

<b>Examples:</b>

- `feat(back): add the vacancy search endpoint (openspec 261120-1432)`
- `fix(front): resolve the company list alignment issue`
- `docs(openspec): add the change for saved searches`
- `chore(root): update project dependencies`
