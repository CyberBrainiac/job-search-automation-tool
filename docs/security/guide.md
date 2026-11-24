# Security guide for Claude agents

This guide gives the security rules for code in this repository. The research behind it is in [`research.md`](research.md).

Read this guide before you write or review code that touches one of these: request input, authentication, database access, outbound HTTP requests, dependencies, configuration, logs.

## 0. How to use this guide

- Each rule has an ID, for example `SEC-01.2`. Write the ID in a code comment, a spec scenario or a test name when you apply the rule.
- **MUST** means: no exception without a written reason in `design.md` of the change.
- Each rule has a **Check** column. It tells how a test or a tool can prove the rule:

| Check    | Meaning                                                                        |
| -------- | ------------------------------------------------------------------------------ |
| `e2e`    | A supertest request in `apps/back/test/*.e2e-spec.ts`.                         |
| `unit`   | A Vitest unit test next to the code.                                           |
| `static` | A text search in the code (§11). It can run in CI.                             |
| `config` | A check of a config file (`main.ts`, `next.config.ts`, `pnpm-workspace.yaml`). |
| `review` | A person or an agent checks it at code review (§13).                           |

- The product has no database, no login and no GraphQL yet. A rule starts to apply when the first code of its area comes. Example: SEC-04 applies when the first login code comes.

### Rules for the OpenSpec workflow

| ID       | Rule                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-00.1 | A change that adds an endpoint, a Server Action or a page with data MUST have security scenarios in its spec delta: one for "no session", one for "other user's object", one for "invalid input". |
| SEC-00.2 | Write the security scenarios before the code, like all other scenarios. The tests MUST fail for the expected reason first.                                                                        |
| SEC-00.3 | Give each security scenario the rule ID at the end of its name, for example `Other user cannot read a vacancy (SEC-01.1)`.                                                                        |
| SEC-00.4 | Run the review checklist (§13) before you set the status `Implemented`.                                                                                                                           |

### Rules for testability

| ID       | Rule                                                                                                                                                                                            | Check    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-00.5 | Register global guards, pipes, filters and interceptors as providers in `AppModule` (`APP_GUARD`, `APP_PIPE`, `APP_FILTER`, `APP_INTERCEPTOR`), not in `main.ts`. Then e2e tests run with them. | `static` |
| SEC-00.6 | Put the app setup that only `main.ts` can do (helmet, CORS, body limits) in one function `configureApp(app)`. Call it from `main.ts` and from the e2e tests.                                    | `review` |

Why: the e2e tests build the app from `AppModule`. Code in `main.ts` does not run in the tests, so a test can pass while production is different.

---

## 1. SEC-01 Broken access control

**Risk:** a user reads or changes data of another user, or calls an admin function. This is #1 in OWASP Top 10:2025 and in the API Top 10.

| ID       | Rule                                                                                                                                                          | Check           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| SEC-01.1 | Each query for user data MUST filter by the owner: `where: { id, userId }`. Do not load by `id` only and check later.                                         | `e2e`           |
| SEC-01.2 | When the object does not exist or the user is not the owner, return `404 Not Found`. Do not return `403`, which tells that the object exists.                 | `e2e`           |
| SEC-01.3 | Deny by default: one global auth guard (`APP_GUARD`) protects all routes. A public route MUST have the `@Public()` decorator.                                 | `e2e`, `static` |
| SEC-01.4 | Admin functions MUST have a role check (`@Roles('admin')` + guard) on the server. A hidden button in the UI is not a check.                                   | `e2e`           |
| SEC-01.5 | Take the user ID from the verified session or token only. Never take it from the body, the query or a header that the client sets.                            | `e2e`           |
| SEC-01.6 | Next.js: do not check auth only in `proxy.ts` (middleware). Check the session again in each Server Action, Route Handler and data function. (CVE-2025-29927.) | `review`        |
| SEC-01.7 | Next.js: each exported Server Action (`'use server'`) is a public POST endpoint. It MUST check the session and validate its arguments.                        | `review`        |
| SEC-01.8 | For `update` and `delete`, use `updateMany` / `deleteMany` with `where: { id, userId }` and check `count`. Or load with the owner filter first.               | `unit`          |
| SEC-01.9 | GraphQL: check authorization in each resolver and each field resolver that returns user data, not only at the top query.                                      | `e2e`           |

```ts
// BAD: any logged-in user can read any vacancy
findOne(id: string) {
  return this.prisma.vacancy.findUnique({ where: { id } });
}

// GOOD: SEC-01.1, SEC-01.2
async findOne(id: string, userId: string) {
  const vacancy = await this.prisma.vacancy.findFirst({ where: { id, userId } });
  if (!vacancy) throw new NotFoundException();
  return vacancy;
}
```

**Test ideas** (scenario names for a spec):

- `Anonymous user cannot read a vacancy (SEC-01.3)`: GET `/vacancies/:id` with no session → `401`.
- `Other user cannot read a vacancy (SEC-01.1)`: user B reads the vacancy of user A → `404`.
- `Other user cannot delete a vacancy (SEC-01.8)`: user B sends DELETE → `404`, and the vacancy still exists.
- `User ID in the body is ignored (SEC-01.5)`: user B sends `{ "userId": "<A>" }` → the record belongs to B (or `400`, see SEC-02.1).
- `Regular user cannot call an admin route (SEC-01.4)`: → `403`.
- `Route list check (SEC-01.3)`: a unit test reads all routes from the Nest router. Each route without `@Public()` returns `401` with no session.

---

## 2. SEC-02 Mass assignment and data exposure

**Risk:** the client sets a field that it must not set (`role`, `userId`), or the server returns a field that the client must not see (password hash, tokens). OWASP API3.

| ID       | Rule                                                                                                                                   | Check            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| SEC-02.1 | Use one global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`. An unknown field gives `400`. | `e2e`            |
| SEC-02.2 | Each body, query and param has a DTO class with `class-validator` decorators. No `@Body() body: any` and no `Record<string, unknown>`. | `static`         |
| SEC-02.3 | Never pass the request body to Prisma: no `data: body`, no `where: query`. Copy the allowed fields one by one.                         | `static`         |
| SEC-02.4 | Never return a Prisma model from a controller. Use `select` with the needed fields, or map to a response type from `@repo/shared`.     | `unit`, `review` |
| SEC-02.5 | Next.js: pass to a Client Component only the fields that it shows. Mark server-only modules with `import 'server-only'`.               | `review`         |

```ts
// BAD: the client can send { "role": "admin" }
create(@Body() body: any) {
  return this.prisma.user.create({ data: body });
}

// GOOD: SEC-02.1 to SEC-02.4
create(@Body() dto: CreateContactDto, @CurrentUser() user: SessionUser) {
  return this.prisma.contact.create({
    data: { name: dto.name, email: dto.email, userId: user.id },
    select: { id: true, name: true, email: true },
  });
}
```

**Test ideas:**

- `Unknown field is rejected (SEC-02.1)`: POST with `{ "isAdmin": true }` → `400`.
- `Response has no secret fields (SEC-02.4)`: GET `/users/me` → the body has no `passwordHash`, `refreshToken` or other secret key. Write one helper `expectNoSecretKeys(body)` and use it in each e2e test.

---

## 3. SEC-03 Injection (SQL, operator, XSS, command, log)

**Risk:** user data runs as code: SQL, HTML/JavaScript in the browser, a shell command. OWASP A05. AI-generated code fails to stop XSS in 86% and log injection in 88% of cases (Veracode 2025).

### SQL and Prisma

| ID       | Rule                                                                                                                                                        | Check    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-03.1 | Use the Prisma query API. For raw SQL, use only the tagged template `` $queryRaw`... ${value}` `` or `Prisma.sql`. Lists use `Prisma.join(ids)`.            | `static` |
| SEC-03.2 | Do not use `$queryRawUnsafe`, `$executeRawUnsafe` or `Prisma.raw()` with any value that comes from outside. A column name for sort comes from an allowlist. | `static` |
| SEC-03.3 | Validate the type of each filter value (`@IsString()`). Then an attacker cannot send an object such as `{ "contains": "" }` in place of a string.           | `e2e`    |

```ts
// BAD: SQL injection
await prisma.$queryRawUnsafe(`SELECT * FROM "Vacancy" WHERE title = '${title}'`);

// GOOD: SEC-03.1 (value is sent as a parameter)
await prisma.$queryRaw`SELECT * FROM "Vacancy" WHERE title = ${title}`;

// GOOD: SEC-03.2 (column name from an allowlist)
const SORT_FIELDS = ['createdAt', 'title', 'salary'] as const;
const sortBy = SORT_FIELDS.includes(input) ? input : 'createdAt';
```

### XSS and unsafe URLs (front app)

Vacancy texts, company pages and links come from other websites. Treat them as hostile.

| ID       | Rule                                                                                                                                         | Check    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-03.4 | Show outside text as React text (`{value}`). React escapes it.                                                                               | `review` |
| SEC-03.5 | Do not use `dangerouslySetInnerHTML`. When HTML is necessary (a vacancy description), sanitize it with DOMPurify on the same line.           | `static` |
| SEC-03.6 | A URL from outside data goes to `href` or `src` only after a check that the protocol is `https:` or `http:`. This stops `javascript:` links. | `unit`   |
| SEC-03.7 | A redirect target from a query parameter (`?next=`) MUST be a relative path that starts with `/` and not with `//` or `/\`.                  | `unit`   |

```ts
// GOOD: SEC-03.6
export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}
```

### Command, code and log injection (back app)

| ID        | Rule                                                                                                                   | Check    |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-03.8  | Do not use `exec()` or a shell string. Use `execFile(cmd, [args])` with an args array.                                 | `static` |
| SEC-03.9  | Do not use `eval`, `new Function` or `vm` on outside data.                                                             | `static` |
| SEC-03.10 | Remove `\r` and `\n` from user values before you log them. Better: log structured objects, not joined strings.         | `unit`   |
| SEC-03.11 | A file path from input MUST stay inside its base folder: `path.resolve(base, name)` must start with `base + path.sep`. | `unit`   |

**Test ideas:**

- `SQL text in a search is treated as text (SEC-03.1)`: search `' OR 1=1 --` → `200` with no results, not all rows.
- `Object in a string filter is rejected (SEC-03.3)`: GET `/vacancies?title[contains]=` → `400`.
- `javascript URL is not rendered as a link (SEC-03.6)`: `safeHttpUrl('javascript:alert(1)')` → `null`.
- `Unsafe HTML in a vacancy description is removed (SEC-03.5)`: the sanitizer output of `<img src=x onerror=alert(1)>` has no `onerror`.
- `External redirect is refused (SEC-03.7)`: `?next=//evil.com` → redirect to `/`.

---

## 4. SEC-04 Authentication failures

**Risk:** an attacker guesses or steals a password, a token or a session. OWASP A07 and API2.

| ID       | Rule                                                                                                                                                              | Check           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| SEC-04.1 | Do not write your own auth or crypto. Use a maintained library (for example `@nestjs/jwt` + Passport, or an auth service). Ask the developer before you pick one. | `review`        |
| SEC-04.2 | Hash passwords with Argon2id (`argon2` package). Never store, log or return a plain password.                                                                     | `unit`          |
| SEC-04.3 | Login errors MUST be the same for "unknown email" and "wrong password": `401` with one message.                                                                   | `e2e`           |
| SEC-04.4 | Limit login, sign-up and password-reset tries: 5 per minute for each IP and email (SEC-09.1).                                                                     | `e2e`           |
| SEC-04.5 | JWT: set the algorithm in `verify` (`algorithms: ['HS256']`), check `exp`, and give access tokens a short life (15 minutes or less).                              | `unit`          |
| SEC-04.6 | Keep session and refresh tokens in cookies with `httpOnly`, `secure`, `sameSite: 'lax'`. Never in `localStorage`.                                                 | `e2e`, `static` |
| SEC-04.7 | Logout and password change MUST end the session on the server (delete or rotate the refresh token).                                                               | `e2e`           |
| SEC-04.8 | Password rules: 8 characters minimum, 64 or more allowed, no forced rotation. Check against a breached-password list when possible.                               | `unit`          |

**Test ideas:**

- `Login does not reveal if an email exists (SEC-04.3)`: unknown email and wrong password give the same status and body.
- `Sixth login try in a minute is blocked (SEC-04.4)`: → `429`.
- `Expired token is rejected (SEC-04.5)`: a token with `exp` in the past → `401`.
- `Token with alg none is rejected (SEC-04.5)`: → `401`.
- `Session cookie has secure flags (SEC-04.6)`: the `Set-Cookie` header has `HttpOnly`, `Secure`, `SameSite=Lax`.
- `Old refresh token does not work after logout (SEC-04.7)`: → `401`.

---

## 5. SEC-05 Security misconfiguration

**Risk:** a default or debug setting opens the app. OWASP A02 (up to #2 in 2025) and API8, API9.

| ID       | Rule                                                                                                                                                                                                     | Check           |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| SEC-05.1 | Back app: use `helmet()` for security headers.                                                                                                                                                           | `e2e`, `config` |
| SEC-05.2 | CORS: allow only the front app origin from an env variable. Never `origin: '*'` or `origin: true` with `credentials: true`.                                                                              | `e2e`, `static` |
| SEC-05.3 | Front app: set headers in `next.config.ts` (`headers()`): `Content-Security-Policy` (with `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy`. Set `poweredByHeader: false`. | `config`        |
| SEC-05.4 | In production, turn off GraphQL introspection, GraphQL playground / GraphiQL and Swagger UI.                                                                                                             | `e2e`, `config` |
| SEC-05.5 | Error responses in production have no stack trace and no internal message (SEC-10.1).                                                                                                                    | `e2e`           |
| SEC-05.6 | Remove debug, test and old endpoints before merge. Each route is in a spec.                                                                                                                              | `review`        |
| SEC-05.7 | Do not turn off TLS checks (`rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`).                                                                                                              | `static`        |

**Test ideas:**

- `Security headers are set (SEC-05.1)`: any response has `x-content-type-options: nosniff` and no `x-powered-by`.
- `Unknown origin gets no CORS header (SEC-05.2)`: a request with `Origin: https://evil.com` → no `access-control-allow-origin`.
- `Introspection is off in production (SEC-05.4)`: with `NODE_ENV=production`, a `__schema` query → error.

---

## 6. SEC-06 Software supply chain

**Risk:** a bad or old package runs code in the app or on the developer PC. OWASP A03 (new in 2025) and A08. In 2025 the "Shai-Hulud" worm infected more than 700 npm packages.

| ID       | Rule                                                                                                                                                                                               | Check    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-06.1 | Add a dependency only when the task needs it. Before you add it, check on npmjs.com that the name is correct, the package is maintained and widely used. AI agents sometimes invent package names. | `review` |
| SEC-06.2 | Commit `pnpm-lock.yaml`. CI installs with `pnpm install --frozen-lockfile`.                                                                                                                        | `config` |
| SEC-06.3 | Set `minimumReleaseAge: 1440` (minutes, 1 day) in `pnpm-workspace.yaml`. Then a new, maybe infected, version is not installed in its first day.                                                    | `config` |
| SEC-06.4 | Keep install scripts blocked (pnpm 10 default). Add a package to `onlyBuiltDependencies` only with a reason in the commit message.                                                                 | `config` |
| SEC-06.5 | No version ranges `*`, `latest` or `x`. Use `^` or an exact version.                                                                                                                               | `static` |
| SEC-06.6 | CI runs `pnpm audit --audit-level high`. A high or critical issue in a used package blocks the merge.                                                                                              | `config` |
| SEC-06.7 | Update Next.js and React within days of a critical security release (examples: CVE-2025-29927, CVE-2025-55182).                                                                                    | `review` |
| SEC-06.8 | GitHub Actions: pin each action to a full commit SHA. Set `permissions: contents: read` and add more only when a job needs it.                                                                     | `static` |

---

## 7. SEC-07 Secrets and cryptographic failures

**Risk:** a secret leaks through Git, the browser bundle or logs; personal data is stored without protection. OWASP A04. The product stores HR contacts, which are personal data.

| ID       | Rule                                                                                                                                                                                | Check    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-07.1 | No secret in code, tests, docs or commits. Secrets come from env variables. `.env` stays in `.gitignore`; `.env.example` has names with no values.                                  | `static` |
| SEC-07.2 | Front app: a secret never gets the `NEXT_PUBLIC_` prefix. Only `NEXT_PUBLIC_*` values go to the browser.                                                                            | `static` |
| SEC-07.3 | Validate all env variables at startup (for example a `zod` schema). The app does not start when a variable is missing.                                                              | `unit`   |
| SEC-07.4 | Use `crypto.randomBytes()` or `crypto.randomUUID()` for tokens and codes. Never `Math.random()`.                                                                                    | `static` |
| SEC-07.5 | Compare secrets (tokens, signatures) with `crypto.timingSafeEqual`, not `===`.                                                                                                      | `review` |
| SEC-07.6 | Never store a user's password of another site (LinkedIn, job platforms). Use OAuth or an official API token. Encrypt stored third-party tokens with AES-256-GCM and a key from env. | `review` |
| SEC-07.7 | Store only the personal data that a feature needs. A user can delete their HR contacts.                                                                                             | `e2e`    |
| SEC-07.8 | Use HTTPS in production. Set `Strict-Transport-Security` when the app runs behind HTTPS.                                                                                            | `config` |

---

## 8. SEC-08 SSRF and unsafe use of third-party data

**Risk:** the server fetches a URL that an attacker controls and reaches internal services; or data from a job platform harms the app. OWASP A01 (SSRF), API7, API10. This product fetches outside pages and APIs, so this risk is high here.

| ID       | Rule                                                                                                                                                                                                                                                     | Check    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-08.1 | Outbound requests go only to an allowlist of hosts (the job platforms that the product supports). Keep the list in one file.                                                                                                                             | `unit`   |
| SEC-08.2 | When a URL comes from a user or from scraped data, allow only `https:`, resolve the host, and refuse private and local IPs: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `0.0.0.0`, `::1`, `fc00::/7`, `fe80::/10`. | `unit`   |
| SEC-08.3 | Do not follow redirects blindly: use `redirect: 'manual'` and check each new URL with SEC-08.1 and SEC-08.2.                                                                                                                                             | `unit`   |
| SEC-08.4 | Each outbound request has a timeout (`signal: AbortSignal.timeout(10_000)`) and a maximum response size.                                                                                                                                                 | `unit`   |
| SEC-08.5 | Validate each third-party response with a schema before you save it. Save only the fields that you need.                                                                                                                                                 | `unit`   |
| SEC-08.6 | Third-party HTML and URLs follow SEC-03.5 and SEC-03.6 before they are shown.                                                                                                                                                                            | `unit`   |
| SEC-08.7 | Next.js: list exact hosts in `images.remotePatterns`. No `hostname: '**'`.                                                                                                                                                                               | `config` |

**Test ideas:**

- `Fetch to a local address is refused (SEC-08.2)`: `http://127.0.0.1`, `http://169.254.169.254/`, `http://[::1]` → error, no request sent.
- `Host outside the allowlist is refused (SEC-08.1)`.
- `Redirect to a private address is refused (SEC-08.3)`: a mock server returns `302` to `http://10.0.0.1`.
- `Slow platform response stops at the timeout (SEC-08.4)`.
- `Platform response with a wrong shape is not saved (SEC-08.5)`.

---

## 9. SEC-09 Unrestricted resource consumption

**Risk:** one client uses all CPU, memory, database or third-party quota. OWASP API4 and API6.

| ID       | Rule                                                                                                                       | Check    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-09.1 | Use `@nestjs/throttler` as a global guard. Give auth routes a lower limit (SEC-04.4).                                      | `e2e`    |
| SEC-09.2 | Each list endpoint has pagination. `take` (page size) has a maximum of 100 (`@Max(100)`) and a default.                    | `e2e`    |
| SEC-09.3 | Keep the default JSON body limit (100 kB). Raise it only for one route, with a reason.                                     | `e2e`    |
| SEC-09.4 | GraphQL: limit query depth (for example 7) and query complexity. Limit the number of operations in one batch.              | `e2e`    |
| SEC-09.5 | Scraping and other background jobs have a concurrency limit and a rate limit for each platform.                            | `unit`   |
| SEC-09.6 | Do not build a `RegExp` from user input. When you must, escape it first. Avoid nested quantifiers such as `(a+)+` (ReDoS). | `static` |
| SEC-09.7 | A file upload has a size limit and a type allowlist.                                                                       | `e2e`    |

**Test ideas:**

- `Page size above the maximum is rejected (SEC-09.2)`: `?take=10000` → `400`.
- `Too many requests are limited (SEC-09.1)`: request number N+1 in the window → `429`.
- `Large body is rejected (SEC-09.3)`: a 1 MB JSON body → `413`.
- `Deep GraphQL query is rejected (SEC-09.4)`.

---

## 10. SEC-10 Error handling and logging failures

**Risk:** an error leaks internals, lets a request continue (fail open), or leaves no trace of an attack. OWASP A10 (new in 2025) and A09.

| ID       | Rule                                                                                                                                                                      | Check    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SEC-10.1 | One global exception filter (`APP_FILTER`). A `500` response has the `ApiErrorResponse` shape from `@repo/shared` and a generic message. No stack, no SQL, no file paths. | `e2e`    |
| SEC-10.2 | Fail closed: when a guard or an auth check throws, the request is denied. A `catch` in security code never returns "allowed".                                             | `unit`   |
| SEC-10.3 | No empty `catch {}`. Log the error, or throw it again.                                                                                                                    | `static` |
| SEC-10.4 | Writes that belong together run in one `prisma.$transaction`, so a failure leaves no half-saved data.                                                                     | `unit`   |
| SEC-10.5 | Log these events with the Nest `Logger`: failed login, `401`, `403`, owner-check `404`, validation `400`, rate limit `429`. Log the user ID, the route and the time.      | `unit`   |
| SEC-10.6 | Never log passwords, tokens, cookies, full request bodies or HR contact data.                                                                                             | `unit`   |
| SEC-10.7 | Use the Nest `Logger`, not `console.log`, in the back app.                                                                                                                | `static` |

```ts
// BAD: fail open
canActivate(ctx: ExecutionContext) {
  try {
    return this.auth.verify(ctx);
  } catch {
    return true;
  }
}

// GOOD: SEC-10.2
canActivate(ctx: ExecutionContext) {
  try {
    return this.auth.verify(ctx);
  } catch {
    throw new UnauthorizedException();
  }
}
```

**Test ideas:**

- `Server error hides internals (SEC-10.1)`: a service mock throws `new Error('db password=x')` → `500`, and the body does not contain `password` or `stack`.
- `Broken token verification denies access (SEC-10.2)`: the verify mock throws → `401`.
- `Failed login is logged without the password (SEC-10.5, SEC-10.6)`: spy on `Logger.warn`; the call has the email, not the password.

---

## 11. Static checks

These searches can become one script in CI later. A hit is an error, or a place for review when the column says so.

In the table, `\|` is the regex OR (`|`). Markdown tables need the backslash.

| Rule     | Search (ripgrep regex)                                               | Folder                  | Result on hit                   |
| -------- | -------------------------------------------------------------------- | ----------------------- | ------------------------------- |
| SEC-02.3 | `data:\s*(req\.)?body\b` and `where:\s*(req\.)?(query\|body)\b`      | `apps/back/src`         | error                           |
| SEC-02.2 | `@(Body\|Query\|Param)\([^)]*\)\s*\w+:\s*any\b`                      | `apps/back/src`         | error                           |
| SEC-03.2 | `\$queryRawUnsafe\|\$executeRawUnsafe\|Prisma\.raw\(`                | `apps/back/src`         | review                          |
| SEC-03.5 | `dangerouslySetInnerHTML` (without `DOMPurify.sanitize` on the line) | `apps/front/src`        | error                           |
| SEC-03.8 | `child_process\|\bexec\(\|execSync\(`                                | `apps`                  | review                          |
| SEC-03.9 | `\beval\(\|new Function\(`                                           | `apps`                  | error                           |
| SEC-04.6 | `localStorage\.(setItem\|getItem)\(.*(token\|jwt\|session)`          | `apps/front/src`        | error                           |
| SEC-05.2 | `origin:\s*(true\|'\*'\|"\*")`                                       | `apps/back/src`         | error                           |
| SEC-05.7 | `rejectUnauthorized:\s*false\|NODE_TLS_REJECT_UNAUTHORIZED`          | whole repo              | error                           |
| SEC-06.5 | `"(\*\|latest\|x)"` in `dependencies` blocks                         | `**/package.json`       | error                           |
| SEC-07.2 | `NEXT_PUBLIC_\w*(SECRET\|PRIVATE\|PASSWORD\|TOKEN\|KEY)`             | whole repo              | error                           |
| SEC-07.4 | `Math\.random\(`                                                     | `apps/back/src`         | review                          |
| SEC-09.6 | `new RegExp\((?!['"\x60])`                                           | `apps`                  | review                          |
| SEC-10.3 | `catch\s*(\([^)]*\))?\s*\{\s*\}`                                     | `apps`                  | error                           |
| SEC-10.7 | `console\.(log\|debug)\(`                                            | `apps/back/src`         | error                           |
| SEC-01.3 | `@Public\(\)`                                                        | `apps/back/src`         | review (list each public route) |
| SEC-00.5 | `useGlobal(Guards\|Pipes\|Filters\|Interceptors)\(`                  | `apps/back/src/main.ts` | error                           |

Also run a secret scanner (for example `gitleaks`) and GitHub secret scanning for SEC-07.1.

## 12. Test helpers to build with the first protected module

| Helper                     | What it does                                                                                  | Used by            |
| -------------------------- | --------------------------------------------------------------------------------------------- | ------------------ |
| `createTestApp()`          | Builds `AppModule`, calls `configureApp(app)` (SEC-00.6) and returns the app.                 | All e2e tests      |
| `loginAs(app, user)`       | Returns a cookie or token for a test user.                                                    | SEC-01, SEC-04     |
| Two test users A and B     | Seed data: each user owns one object of each kind.                                            | SEC-01 tests       |
| `expectNoSecretKeys(body)` | Fails when the body has a key such as `password`, `passwordHash`, `token`, `secret`, `stack`. | SEC-02.4, SEC-10.1 |
| `expectSafeError(res)`     | Checks the `ApiErrorResponse` shape and no stack trace.                                       | SEC-05.5, SEC-10.1 |

Put the security e2e tests of a module in `apps/back/test/<name>.e2e-spec.ts` with the other scenarios of the module. Use `describe('<Requirement name>')` and `it('<Scenario name>')` as in `openspec/README.md` §7.

## 13. Review checklist

Answer each question for the diff. A "no" blocks the change.

1. Does each new route, resolver and Server Action check the session (or have `@Public()` with a reason)? (SEC-01.3, SEC-01.7)
2. Does each query for user data filter by the owner? (SEC-01.1)
3. Does each input have a DTO or schema, and does Prisma get only copied fields? (SEC-02.1 to SEC-02.3)
4. Does each response return only the needed fields? (SEC-02.4)
5. Is there no raw SQL with outside values, no `dangerouslySetInnerHTML` without a sanitizer, no unchecked URL in `href`? (SEC-03)
6. Is each new dependency needed, real and locked? (SEC-06)
7. Is there no secret in the code and no secret with `NEXT_PUBLIC_`? (SEC-07)
8. Does each outbound request use the allowlist, a timeout and a schema check? (SEC-08)
9. Does each list have a page-size limit? (SEC-09.2)
10. Do errors fail closed and hide internals, and do logs have no secrets? (SEC-10)
11. Does each security scenario of the spec have a test that failed first and passes now? (SEC-00.2)
