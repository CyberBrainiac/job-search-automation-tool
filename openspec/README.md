# OpenSpec in Job Search Automation Tool

This folder holds the specifications of Job Search Automation Tool: the back app and the front app. It uses a simplified OpenSpec process for one developer.

- `specs/` holds the current requirements of each capability. The archive (section 9) adds the requirements of each finished change.
- `changes/` holds the open changes. The `Description` section of each `proposal.md` tells what the change gives.
- Read [`project.md`](project.md) first. It describes the project, the folders and the conventions.
- Specifications are written in English and follow the writing rules in section 6.

## 1. Folder structure

```
openspec/
├── README.md              # This file: workflow, formats, writing rules, glossary, checklist
├── project.md             # Project context: product, stack, folders, conventions, commands
├── specs/                 # Current truth for each capability (filled when a change is archived)
│   └── <capability>/spec.md   # Purpose + requirements
└── changes/
    ├── <id>-<slug>/       # One change = one function. Section 2 gives the ID.
    │   ├── proposal.md    # Status, type, description, what changes, impact, dependencies, validation result
    │   ├── design.md      # Technical decisions (only when necessary)
    │   ├── tasks.md       # Checklist: unit tests, then code, then checks
    │   └── specs/<capability>/spec.md   # Delta: ADDED / MODIFIED / REMOVED requirements
    └── archive/<id>-<slug>/  # Finished changes, with the same folder name
```

A **capability** is one area of system behavior, for example `user-auth` or `job-search`.
A **change** is one proposed modification. A change can touch more than one capability.
A **change ID** identifies one change. It is the date and time when the change is created (section 2).

## 2. Workflow

| Step | Action                                                                                    | Who                | Status after the step |
| ---- | ----------------------------------------------------------------------------------------- | ------------------ | --------------------- |
| 1    | Divide the feature into changes (plan).                                                   | Claude             | –                     |
| 2    | Write the change files. Do the validation pass (section 8).                               | Claude             | `Draft`               |
| 3    | Review the change files. Write comments. Claude edits the files.                          | Developer + Claude | `Reviewed`            |
| 4    | Write the unit tests for each scenario. Run them. They must fail for the expected reason. | Claude             | `Tested`              |
| 5    | Write the code. Run the tests and the build checks. They must pass.                       | Claude             | `Implemented`         |
| 6    | Archive the change (section 9).                                                           | Claude             | `Archived`            |

Do the changes in the order of their `Depends on` lines. When two changes do not depend on each other, do the change with the earlier ID first.

### Change ID

The ID of a change is the local date and time when you create the change: `YYMMDD-HHMM`, for example `261120-1432`. Two branches can create changes at the same time and get different IDs.

- Get the ID with `date +%y%m%d-%H%M` (Bash) or `Get-Date -Format yyMMdd-HHmm` (PowerShell).
- The folder name is `<id>-<slug>`, for example `261120-1432-job-search-form`. The slug is a short name in kebab case.
- When you create more than one change at one time, give them the next free minutes in the order of the plan: `261120-1432`, `261120-1433`, `261120-1434`.
- No other folder in `changes/` or `changes/archive/` can start with the same ID.
- Do not change an ID after you create the change. The archive keeps the folder name.

Refer to a change by its ID. A search for the ID finds the folder and all references.

| Place                      | Form                                                                            |
| -------------------------- | ------------------------------------------------------------------------------- |
| `Depends on`, `Implements` | `Depends on: 261120-1432 (<what this change uses>)`                             |
| Spec text, design, tasks   | change `261120-1432`                                                            |
| A range of changes         | the changes `261120-1432` to `261120-1435` (all IDs from the first to the last) |
| A file of a change         | `261120-1432-job-search-form/design.md` §1                                      |
| Commit message             | `feat(back): add the job search endpoint (openspec 261120-1432)`                |
| Code comment               | `(openspec change 261120-1432)`                                                 |

Git keeps the history of all edits. Do not make version copies of files.

## 3. Change files

### `proposal.md`

```markdown
# <id> — <Title>

Status: Draft | Reviewed | Tested | Implemented | Archived
Type: Feature | Bug fix | Feature, bug fix
Depends on: <change ids or "none">
Implements: <back change ids that this front change shows in the app> (front changes only)
Decisions: <decision ids, for example D1, D4. `design.md` gives them.>

## Description
<A feature explanation, a bug report, or both. See "Description rules".>

## What changes
- <One line for each change in behavior.>

## Impact
| Area | Items |
|---|---|
| Endpoints | ... |
| Files | ... |
| Database | ... |
| Front app | ... |

## Validation
- [x] <Checklist item from README section 8> — <short result>
```

### Description rules

The description tells the reader what is new or what is wrong. The reader must understand it with no other file and no knowledge of the history of the work.

Use the form that agrees with `Type`. A change with the type `Feature, bug fix` has the feature explanation first and the bug report after it.

**Feature explanation** (`Feature`):

- Write 1–5 sentences.
- Sentence 1 tells who can do what after the change, or what the system does.
- The next sentences tell the business need or the limit of the system today. One example is optional.

```markdown
## Description

A user can save a search and run it again later. The system keeps the keywords and the filters of the search.
Today the user must type the search again each time.
```

**Bug report** (`Bug fix`):

- Write one table row for each bug. Write a maximum of 2 short sentences in each cell.
- "Actual behavior" is the action and the wrong result, as a person or an API client sees it.
- "Expected behavior" is the correct result.
- "Risk" is High, Medium or Low.

```markdown
## Description

| # | Actual behavior | Expected behavior | Risk |
|---|---|---|---|
| 1 | A user opens the saved search of another user. The system shows the search. | The system returns `404 Not Found`. | High |
```

Do not write these items in the description:

| Item                                                                                                        | Where it goes                                          |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| How, when or by whom a problem was found. Who asked for the change. The text of a review or a conversation. | Nowhere. Git and the review comments hold the history. |
| The status history of the change, for example "reopened".                                                   | Nowhere. Git holds it.                                 |
| The code cause of a bug: a decorator, the order of methods, a query detail.                                 | `design.md`, when the fix needs it.                    |
| The solution.                                                                                               | `What changes`.                                        |
| Lists of files.                                                                                             | `Impact`.                                              |

Code names are correct in the description when the reader sees them: a route, a page, a dialog, an error code.

### `design.md`

Write a design only when a change has a technical decision: a new table, a migration, an algorithm, or a choice between options.
Give the decision and the reason. Do not list options that we do not use.
Do not write the history of a decision (who decided it, and when). Write the decision and its reason only.

Put the decisions in a table in `## 1. Decisions`, with an ID for each decision:

```markdown
## 1. Decisions

| ID | Decision | Reason |
|---|---|---|
| SR1 | <The decision.> | <The reason.> |
```

Use a short prefix for the IDs of one change or one group of changes, for example `SR` for "saved search". Write `Decisions: SR1–SR4 (`design.md` §1)` in `proposal.md`.

### `tasks.md`

A checklist in three groups:

1. **Unit tests (step 4):** one line for each test file.
2. **Code (step 5):** one line for each file or small group of files.
3. **Checks:** the commands that must pass.

At the end of the file, write the results: the tests that failed before the code and the reason, then the commands that passed after the code.

### `specs/<capability>/spec.md` (delta)

```markdown
# Delta for <capability>

## ADDED Requirements

### Requirement: <Short name>
The system SHALL <one behavior>.

#### Scenario: <Short name>
- **GIVEN** <start state>
- **WHEN** <one action>
- **THEN** <result>
- **AND** <more result>
```

### `specs/<capability>/spec.md` (current truth)

```markdown
# <capability>

## Purpose

<What the capability does and for whom. 1–3 sentences.>
<Optional: shared data of the examples.>

## Requirements

### Requirement: <Short name>
...
```

- The archive (section 9) makes and edits this file. Do not edit it in a change. Write a delta.
- The purpose is a feature explanation. Do not write change IDs or history in it.

## 4. Requirement and scenario rules

- Write one behavior for each requirement. Use **SHALL** or **SHALL NOT**.
- Give each requirement one or more scenarios.
- Give each scenario a **WHEN** and a **THEN**. **GIVEN** and **AND** are optional.
- Use a unique scenario name in each capability. The unit test uses this name (section 7).
- Give the HTTP method, the path and the HTTP status code when a scenario uses an endpoint.
- Do not give exact error message texts, unless the front app shows them.
- Write the paths as the back app serves them. When the back app gets a global prefix (for example `/api`), write the paths with it.

Rules for a screen (front changes):

- Write **WHEN** as one action of a person on the screen.
- Write **THEN** as what the screen shows, or as the request that the app sends.
- Give the method, the path and the body fields of each request that the app sends.
- Give a server response in **GIVEN** (for example "the server returns `409 Conflict`"). The unit test mocks it.
- Give the exact text of a message that the app owns.

## 5. Delta sections

| Section                    | Use                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `## ADDED Requirements`    | A new requirement.                                                                                |
| `## MODIFIED Requirements` | A changed requirement that already exists in `specs/`. Copy the full requirement, then change it. |
| `## REMOVED Requirements`  | A requirement that exists in `specs/` and must go. Give the reason.                               |

A change uses `MODIFIED` or `REMOVED` for a requirement in `specs/` or in an open change that comes before it (the order of section 2).
Use the requirement name exactly as it is in that file.

## 6. Writing rules (ASD-STE100 subset)

Use these rules for all text in `openspec/`.

| Rule                                                               | Example                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Write procedural sentences of 20 words or fewer.                   | "Run the tests."                                                                                                    |
| Write descriptive sentences of 25 words or fewer.                  | "A saved search is a set of keywords and filters that a user can run again."                                        |
| Write one instruction in one sentence.                             | Not: "Add the DTO and register it and test it."                                                                     |
| Use the imperative for procedures.                                 | "Add the module to `app.module.ts`."                                                                                |
| Use the active voice.                                              | "The system creates a saved search." Not: "A saved search is created."                                              |
| Use the present tense.                                             | "The system returns 404." Not: "The system will return 404."                                                        |
| Use one word for one meaning. Use the glossary terms (section 10). | Always the same term for one thing, for example "vacancy", never "job posting" in one place and "offer" in another. |
| Use simple approved words.                                         | See the table below.                                                                                                |
| Use tables and lists for data.                                     | –                                                                                                                   |
| Code names are technical names. Write them in `code` style.        | `AppService`, `getHello`                                                                                            |

| Do not use          | Use           |
| ------------------- | ------------- |
| utilize             | use           |
| ensure              | make sure     |
| initiate, commence  | start         |
| terminate           | stop          |
| display (verb)      | show          |
| perform             | do            |
| prior to            | before        |
| in order to         | to            |
| via                 | through, with |
| should (for a rule) | SHALL / must  |

## 7. Test traceability

Each scenario has at least one unit test or one journey test.

```ts
describe('<Requirement name>', () => {
  it('<Scenario name>', () => { /* ... */ });
});
```

Use the exact names from the spec. Then a search for a scenario name finds its test.
Mark a scenario that only a journey test can check with `(journey)` after its name.

Test locations:

| Code                                           | Test runner                                 | Test location                                                                                                             |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Back module (`apps/back/src`)                  | Vitest                                      | Next to the code: `<name>.service.spec.ts`, `<name>.controller.spec.ts`                                                   |
| Back end-to-end (HTTP)                         | Vitest + supertest (`vitest.config.e2e.ts`) | `apps/back/test/<name>.e2e-spec.ts`                                                                                       |
| Front component, page, hook (`apps/front/src`) | None yet                                    | The front app has no test runner. The first change with a front scenario adds one, and updates this row and `project.md`. |

## 8. Validation checklist

Do this pass at the end of step 2. Write the result in the `Validation` section of each `proposal.md`.

1. Each requirement has one or more scenarios. Each scenario has WHEN and THEN.
2. Each file, function, endpoint, table, component and route in the change exists in the code, or the change marks it as NEW.
3. No two changes modify the same requirement in conflicting ways.
4. Each decision of `design.md` §1 is in one or more requirements or tasks.
5. A unit test can check each scenario, or the scenario has the `(journey)` mark.
6. Each migration has `up` and `down`. `up` can run two times with no error (idempotent). A change with no database change has no migration.
7. The text follows the writing rules in section 6.
8. The description follows the description rules in section 3: a feature explanation, a bug report, or both, with no history of the work.
9. The change ID is unique in `changes/` and `changes/archive/` (section 2). Check it again after a merge of two branches.

## 9. Archive procedure

Do these steps when a change has the status `Implemented`.

1. For each delta in `changes/<id>/specs/<capability>/spec.md`:
   - When `specs/<capability>/spec.md` does not exist, make it with the title, `## Purpose` and `## Requirements` (section 3).
   - Copy each `ADDED` requirement into `specs/<capability>/spec.md`.
   - Replace each `MODIFIED` requirement in `specs/<capability>/spec.md`.
   - Delete each `REMOVED` requirement from `specs/<capability>/spec.md`.
   - Copy the shared example data of the delta (text before `## ADDED`) into `## Purpose`.
   - Update `## Purpose` when the change gives the capability a new aim.
2. Set the status in `proposal.md` to `Archived`.
3. Move the folder to `changes/archive/`. Do not change the folder name `<id>-<slug>`.

## 10. Glossary

Add a term here when a change uses it for the first time. Write `(NEW in change <id>)` at the end of its meaning. Then use the term with this one meaning in all files.

| Term                        | Meaning                                                                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Back app**                | The NestJS app: `apps/back`.                                                                                                                                   |
| **Front app**               | The Next.js app: `apps/front`.                                                                                                                                 |
| **Error response**          | The JSON body that the back app sends for a request that ends with an exception. Its type is `ErrorResponse` of `@repo/shared`. (NEW in change `261124-0853`)  |
| **Error code**              | A fixed text of `ErrorCodes` in `@repo/shared`, for example `RESOURCE_NOT_FOUND`. It tells the front app the reason of an error. (NEW in change `261124-0853`) |
| **Business error**          | An error that the code throws on purpose with `CustomException`. It has an HTTP status and an error code. (NEW in change `261124-0853`)                        |
| **Unexpected error**        | An exception that is not an `HttpException`, for example a `TypeError`, or a thrown value that is not an `Error`. (NEW in change `261124-0853`)                |
| **Global exception filter** | `AllExceptionsFilter`: the one NestJS filter that catches each exception of the back app and sends the error response. (NEW in change `261124-0853`)           |
