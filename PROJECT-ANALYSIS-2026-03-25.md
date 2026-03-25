# Project Analysis - 2026-03-25

## Overview

`1on1` is a structured one-on-one meeting SaaS built as a Next.js 16 monolith with TypeScript, App Router, Drizzle ORM, PostgreSQL, Auth.js, i18n, and an integrated AI pipeline. The repository is organized clearly by domain: routes in `src/app`, UI in `src/components`, business logic in `src/lib`, translations in `messages`, and documentation in `docs`.

The overall architecture is appropriate for the product stage. Keeping the system as a monolith reduces operational complexity while still supporting a fairly rich product surface: templates, sessions, analytics, people/team management, notifications, and AI-assisted outputs.

## Strengths

- The architectural model is coherent: reads are handled close to the app layer, mutations flow through API routes, and validation is centralized with Zod.
- Multi-tenancy appears to be treated seriously through `tenant_id` scoping and tenant-aware DB access patterns.
- Authentication is stronger than average for this kind of product: credentials, OAuth, impersonation, and language-aware session claims are all present.
- The AI pipeline is not superficial. It includes context gathering, audit logging, analytics updates, email fallback behavior, and Sentry instrumentation.
- Test coverage is meaningful for the stage of the product: there are both unit/integration tests and a substantial Playwright E2E suite.

## Main Risks

- The biggest operational gap is CI enforcement. The Playwright workflow is currently manual-only, so browser-level regressions are not automatically blocked on push or pull request.
- Tooling is split between `npm` in local usage and `bun` in CI/workflows. That mismatch can create avoidable debugging and reproducibility issues.
- `src/lib/auth/config.ts` holds a lot of behavior in one place, which increases maintenance and change risk.
- The AI pipeline is functionally solid, but it is still operationally fragile compared to a queue-backed job system with explicit retry and idempotency semantics.
- Repo hygiene needs tightening. Local artifacts and generated outputs can easily create noisy worktrees and make releases less predictable.

## Assessment

This is a strong product-oriented codebase, not a throwaway prototype. The system design is mostly sound, the domain modeling is substantial, and the repo reflects real product evolution rather than disconnected experiments.

The codebase does not need a rewrite. It needs operational hardening:

1. Re-enable E2E as a real CI gate for PRs and pushes.
2. Standardize the package/runtime toolchain across local and CI workflows.
3. Gradually extract dense logic from auth and long-running AI flows.
4. Tighten ignore rules and release hygiene around generated files and local artifacts.

## Conclusion

The project is in a good state structurally and product-wise. The next gains are less about architecture changes and more about reliability, release discipline, and maintainability under continued growth.
