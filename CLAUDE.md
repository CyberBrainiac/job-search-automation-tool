# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Job Search Automation Tool keeps people informed about the latest vacancies on job aggregator platforms, saves company information and HR contacts, and helps to find people on LinkedIn. It is a pnpm + Turborepo monorepo with two apps: `apps/back` (NestJS 12, port 3000) and `apps/front` (Next.js 16 App Router + Tailwind CSS 4, port 3001). Types used by both apps live in `packages/shared` (`@repo/shared`). There is no database yet.

## Read these first

| File                              | When                                                                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `openspec/project.md`             | Before any code work or any spec work. It holds the product, the stack, the repository map, the module anatomy and registration steps, the conventions, the commands and the known issues.                 |
| `openspec/README.md`              | Before you read, write or implement a change. It holds the workflow, file formats, writing rules, validation checklist and glossary.                                                                       |
| `docs/claude-code-tools-setup.md` | For the Claude tools of this repository (TypeScript LSP, ast-grep, jq).                                                                                                                                    |
| `docs/security/guide.md`          | Before you write or review code that touches input, auth, database access, outbound requests, dependencies, config or logs. It holds the security rules (`SEC-xx.y`), test ideas and the review checklist. |

Do not duplicate their content in code comments or new docs. Update them when the facts change.

## OpenSpec workflow (how work is done here)

Development is spec-driven. Each feature is split into changes in `openspec/changes/<id>-<slug>/` (`proposal.md`, optional `design.md`, `tasks.md`, `specs/<capability>/spec.md` deltas).

- The change ID is the local creation date and time `YYMMDD-HHMM` (`date +%y%m%d-%H%M`), for example `261120-1432-job-search-form`. Changes made in one plan get the next free minutes in plan order. Never reuse or change an ID. Rules: `openspec/README.md` §2.
- Refer to a change by its ID everywhere: `Depends on: 261120-1432 (...)`, "change `261120-1432`" in specs, `(openspec 261120-1432)` at the end of a commit subject, `(openspec change 261120-1432)` in code comments.
- Status flow in `proposal.md`: `Draft` → `Reviewed` (developer reviewed) → `Tested` (unit tests written and fail for the expected reason) → `Implemented` (code done, tests and builds pass) → `Archived`. Update the `Status:` line when a step is done.
- Do not implement a change that is still `Draft`. The developer reviews it first.
- Do the changes in the order of their `Depends on:` lines; for independent changes, the earlier ID first.
- Tests come before code. `tasks.md` lists the test files (group 1), the code files (group 2) and the check commands (group 3). Tick the checkboxes as you go.
- Test traceability: `describe('<Requirement name>')` and `it('<Scenario name>')` use the exact names from the spec. A scenario that only a journey test can check is marked `(journey)`.
- Spec text follows the ASD-STE100 writing rules and the glossary in `openspec/README.md` §6 and §10 (short sentences, active voice, SHALL, one term per meaning).
- The `Description` of `proposal.md` is a short feature explanation or a short bug report table (actual, expected, risk), as in `openspec/README.md` §3. It never tells how the problem was found, who asked, or the review history.
- After you write or edit a change, run the validation checklist (`openspec/README.md` §8) and record the result in the `Validation` section of `proposal.md`.
- Archive (`openspec/README.md` §9): merge the deltas into `openspec/specs/<capability>/spec.md`, set `Archived`, move the folder to `openspec/changes/archive/` with the same name `<id>-<slug>`. A new change uses `MODIFIED`/`REMOVED` against `openspec/specs/` or an open change that comes before it.
- Git holds the history. Do not create versioned copies of spec files.

## Commands

Run them from the repository root.

```bash
pnpm install                          # all apps
pnpm dev                              # back (:3000) and front (:3001) in watch mode
pnpm --filter back dev                # one app only
pnpm build                            # turbo run build
pnpm lint                             # turbo run lint (oxlint in back, ESLint in front)
pnpm format:md                        # Prettier on all .md files (root .prettierrc)
pnpm --filter back test               # Vitest unit tests (*.spec.ts)
pnpm --filter back test app.controller    # one spec file (Vitest name filter)
pnpm --filter back test:e2e           # Vitest + supertest (test/*.e2e-spec.ts)
```

The front app has no test runner yet. The first change with a front scenario adds one (`openspec/README.md` §7).

## Architecture

- `apps/back`: NestJS with ES modules (`"type": "module"`, `nodenext`). Relative imports need the `.js` extension (`./app.service.js`). `main.ts` reads `PORT` (default 3000). New feature modules are imported in `app.module.ts`; the module anatomy and registration steps are in `openspec/project.md` §4. Unit specs sit next to the code; Vitest runs with `globals: true`.
- `apps/front`: Next.js App Router in `src/app/`. The `@/*` alias points to `src/*`. Tailwind CSS 4 loads through `@tailwindcss/turbopack` (`next.config.ts`).
- `packages/shared` (`@repo/shared`): interfaces shared by back and front. Add a file in `src/`, export it from `src/index.ts` (with `.js`), import it with `import type { X } from '@repo/shared'`. It compiles with `tsc` to `dist/`, which both apps read; turbo builds it before `build` and `dev`. Rules: `openspec/project.md` §3 "Shared package".
- `turbo.json` defines `build` (depends on `^build`), `dev` (no cache, persistent, depends on `^build`) and `lint`.

## Conventions

- Commits: Conventional Commits `type(scope): description` (`README.md` "Commit Standards"). Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`. Scopes: `front`, `back`, `openspec`, `root`. End the subject with `(openspec <id>)` when the commit belongs to a change, for example `feat(back): add the vacancy search endpoint (openspec 261120-1432)`.
- Branches: work branch is `development`; `main` is the release branch. Merge `development` into `main` with a pull request. Other branches are `type/short-description` with `feature/`, `bugfix/`, `hotfix/`, `refactor/`, `docs/` (`README.md` "Git Branching Convention").
- Formatting: back uses Prettier with single quotes and trailing commas. Markdown uses the root `.prettierrc` (`proseWrap: preserve`, code blocks are not changed); run `pnpm format:md`. Line endings are LF (`.gitattributes`).
