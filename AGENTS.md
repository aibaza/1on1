# Repository Guidelines

## Project Structure & Module Organization
`src/app` contains the Next.js App Router entry points, route groups, and API handlers. Reusable UI lives in `src/components`, grouped by domain such as `analytics`, `session`, `templates`, and `ui`. Shared business logic lives in `src/lib` (`db`, `auth`, `queries`, `validations`, `analytics`, `ai`), with app-wide providers in `src/providers`, locale wiring in `src/i18n`, and types in `src/types`. Static assets live in `public`. End-to-end tests and Playwright fixtures live in `e2e`. Long-form documentation and wiki source live in `docs/` and `docs/wiki/`.

## Build, Test, and Development Commands
Use `npm run dev` to start local development on port `4300`. Use `npm run build` to create a production build and `npm run start` to serve it. Run `npm run lint` for ESLint and `npm run typecheck` for TypeScript validation. Run `npm test` for Vitest unit/integration tests and `npm run test:watch` during local iteration. Run `npm run test:e2e` for Playwright coverage; the default config starts Next on port `4301`. Database tasks use Drizzle: `npm run db:generate`, `npm run db:migrate`, `npm run db:studio`, plus `npm run db:seed` or `npm run db:seed:editorial`.

## Coding Style & Naming Conventions
This repo uses TypeScript throughout and follows the existing Next.js ESLint config in `eslint.config.mjs`. Match the current style: double quotes, semicolons, and 2-space indentation. Use PascalCase for React components, camelCase for functions and variables, and kebab-case for route segments and most file names; keep spec files as `*.spec.ts`. Prefer the `@/` import alias over deep relative paths.

## Testing Guidelines
Vitest is configured in `vitest.config.ts` with `src/test-setup.ts` and excludes `e2e/**`. Keep unit tests close to the feature they exercise or in clearly named test files, and focus on behavior rather than implementation details. Playwright specs live in `e2e/`; auth bootstrap files use `*.setup.ts`, while browser scenarios use descriptive names such as `dashboard.spec.ts` or `template-versioning.spec.ts`. No coverage gate is enforced in config, so new work should include tests proportional to risk.

## Commit & Pull Request Guidelines
Recent history follows conventional prefixes: `feat:`, `fix:`, `refactor:`, and `style:`. Keep subjects imperative and specific, for example `fix: only admin/manager users can be assigned as managers`. PRs should summarize user-visible changes, note schema or env changes, link the relevant issue, and include screenshots for UI work. If docs or wiki behavior changed, update `docs/` or `docs/wiki/` in the same PR.
