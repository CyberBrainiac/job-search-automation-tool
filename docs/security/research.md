# Research: the 10 most common security errors in fullstack apps

This file is step 1: the research. Step 2, the rules for Claude agents, is in [`guide.md`](guide.md).

Scope: a Next.js 16 front app, a NestJS 12 back app (REST and GraphQL), PostgreSQL with Prisma, pnpm and Turborepo. Research date: 2026-11-24.

## 1. Method

1. Take the two main OWASP lists: the [OWASP Top 10:2025](https://owasp.org/Top10/2025/0x00_2025-Introduction/) (web apps) and the [OWASP API Security Top 10:2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) (APIs). The API list is still the latest edition.
2. Merge the items of the two lists that describe the same error.
3. Rank the merged items by the OWASP rank, then by how often they occur in a Next.js + NestJS + Prisma app.
4. Add the real incidents from 2025–2026 that hit this stack directly.

## 2. The two source lists

| OWASP Top 10:2025 (web)                         | OWASP API Top 10:2023                                   |
| ----------------------------------------------- | ------------------------------------------------------- |
| A01 Broken Access Control (now includes SSRF)   | API1 Broken Object Level Authorization (BOLA)           |
| A02 Security Misconfiguration (up from #5)      | API2 Broken Authentication                              |
| A03 Software Supply Chain Failures (NEW)        | API3 Broken Object Property Level Authorization (BOPLA) |
| A04 Cryptographic Failures                      | API4 Unrestricted Resource Consumption                  |
| A05 Injection (includes XSS)                    | API5 Broken Function Level Authorization (BFLA)         |
| A06 Insecure Design                             | API6 Unrestricted Access to Sensitive Business Flows    |
| A07 Authentication Failures                     | API7 Server Side Request Forgery (SSRF)                 |
| A08 Software or Data Integrity Failures         | API8 Security Misconfiguration                          |
| A09 Security Logging & Alerting Failures        | API9 Improper Inventory Management                      |
| A10 Mishandling of Exceptional Conditions (NEW) | API10 Unsafe Consumption of APIs                        |

Key facts from the 2025 list:

- Broken access control stays #1. 3.73% of the tested apps had one or more of its 40 CWEs.
- Injection has the most CVEs of all categories (38 CWEs).
- Supply chain failures have few cases in the data, but the highest average exploit and impact scores.
- The data covers more than 2.8 million apps and about 175,000 CVE records.

## 3. The merged top 10 for this stack

| #   | Error                                        | OWASP sources           | Why it is common in this stack                                                                                                                      |
| --- | -------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Broken access control (IDOR / BOLA / BFLA)   | A01, API1, API5         | `findUnique({ where: { id } })` with no owner check. Auth only in Next.js `proxy.ts` (middleware). Server Actions without an auth check.            |
| 2   | Mass assignment and excessive data exposure  | API3, A01               | `data: req.body` in Prisma. A full database row sent to the client (password hash, tokens). DTO without `whitelist`.                                |
| 3   | Injection (SQL, operator, XSS, command, log) | A05                     | `$queryRawUnsafe` with string building. `dangerouslySetInnerHTML` with scraped HTML. `javascript:` links in vacancy data. CR/LF in log lines.       |
| 4   | Authentication failures                      | A07, API2               | Weak password hashing. JWT without a fixed algorithm and expiry. Tokens in `localStorage`. No limit on login tries.                                 |
| 5   | Security misconfiguration                    | A02, API8, API9         | `cors({ origin: '*' })`, no security headers, GraphQL introspection and playground in production, Swagger open, stack traces in responses.          |
| 6   | Software supply chain failures               | A03, A08                | Many npm packages. Worms in the npm registry in 2025. Critical CVEs in Next.js and React that need a fast update.                                   |
| 7   | Secrets and cryptographic failures           | A04                     | Secrets in code or in `NEXT_PUBLIC_*` variables. HR contacts (personal data) stored in plain text. `Math.random()` for tokens.                      |
| 8   | SSRF and unsafe use of third-party data      | A01 (SSRF), API7, API10 | The product fetches pages and APIs of job platforms. A user-supplied URL can reach internal hosts. Scraped data goes to the database with no check. |
| 9   | Unrestricted resource consumption            | API4, API6              | No rate limit, no page-size cap, deep GraphQL queries, unbounded scraping jobs, expensive regex on user input.                                      |
| 10  | Error handling and logging failures          | A10, A09                | A `catch` that lets the request continue (fail open). No log of denied access. Secrets or personal data in logs.                                    |

Not in the top 10, but covered inside other items:

- A06 Insecure Design: it is a process risk. The guide covers it with "write the security scenarios in the spec" (guide §1).
- API9 Improper Inventory Management: covered in item 5 (old or debug endpoints that stay open).

## 4. Incidents in 2025–2026 that hit this stack

| Incident                                                   | What happened                                                                                                                                                                         | Lesson                                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| CVE-2025-29927, Next.js middleware bypass (March 2025)     | A request with the header `x-middleware-subrequest` skipped the middleware. Apps that checked auth only in middleware were open. Fixed in 15.2.3 / 14.2.25.                           | Never check auth only in middleware (`proxy.ts`). Check it again next to the data.                                              |
| CVE-2025-55182 / CVE-2025-66478, "React2Shell" (Dec. 2025) | A crafted request to a React Server Function gave remote code execution on the server. Rated critical. Fixed in React 19.0.1 / 19.1.2 / 19.2.1 and Next.js 16.0.7 (and 15.x patches). | Update Next.js and React fast after a security release. This repo uses Next.js 16.4.6 and React 19.3.0, which are not affected. |
| npm worm "Shai-Hulud" (Sept. 2025) and its second wave     | Stolen maintainer tokens published infected versions of more than 700 packages. The code stole npm, GitHub and cloud tokens and added GitHub workflows.                               | Lock dependencies, wait before you install new versions, block install scripts, rotate tokens.                                  |
| Veracode GenAI Code Security Report (July 2025)            | AI-generated code had security flaws in 45% of the test tasks. The models failed to prevent XSS in 86% and log injection in 88% of the cases.                                         | An AI agent needs explicit security rules and tests. Correct syntax does not mean safe code.                                    |

## 5. What the sources agree on

1. Check authorization on the server, for each object, in each handler. Deny by default.
2. Accept only the fields that you expect. Return only the fields that the client needs.
3. Send data to SQL, HTML and shell only through safe APIs that separate code from data.
4. Treat all outside data as untrusted: request input, scraped pages, third-party APIs, dependencies.
5. Make the safe setting the default in code (global guards, global validation pipe, security headers), so a new endpoint is safe without extra work.
6. Write tests for the "bad user" cases, not only for the "good user" cases.

## 6. Sources

- OWASP Top 10:2025 — https://owasp.org/Top10/2025/0x00_2025-Introduction/
- Qualys, "What changed in OWASP Top 10 2025" — https://blog.qualys.com/qualys-insights/2026/06/15/what-changed-in-owasp-top-10-2025-and-recommendations-for-each-category
- OWASP API Security Top 10:2023 — https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- Wiz, "OWASP API Security Top 10" — https://www.wiz.io/academy/api-security/owasp-api-security
- Akamai, "OWASP Top 10 API Security Risks: 2023 edition" — https://www.akamai.com/blog/security/owasp-top-10-api-security-risks-2023-edition
- OWASP GraphQL Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- OWASP Next.js Security Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Nextjs_Security_Cheat_Sheet.html
- Next.js, "Data security" guide — https://nextjs.org/docs/app/guides/data-security
- JFrog, CVE-2025-29927 — https://jfrog.com/blog/cve-2025-29927-next-js-authorization-bypass/
- Okta, CVE-2025-29927 — https://sec.okta.com/articles/nextjs-CVE-202529927/
- JFrog, React2Shell — https://jfrog.com/blog/2025-55182-and-2025-66478-react2shell-all-you-need-to-know
- Recorded Future, npm supply chain attack — https://www.recordedfuture.com/blog/massive-malicious-npm-package-attack-threatens-software-supply-chains
- pnpm, "Mitigating supply chain attacks" — https://pnpm.io/supply-chain-security
- Prisma, "Raw queries" — https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
- NestJS ValidationPipe article — https://dev.to/italoqueiroz/nestjs-validationpipe-ensuring-secure-input-contracts-3dng
- Veracode, GenAI Code Security Report press release — https://www.veracode.com/press-release/ai-generated-code-poses-major-security-risks-in-nearly-half-of-all-development-tasks-veracode-research-reveals/
