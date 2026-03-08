# CLAUDE.md

## Project Overview

`@ainyc/aeo-audit` is the published TypeScript audit engine and CLI at the root of this repository. Phase 1 also introduces a workspace skeleton for a future self-hosted monitoring platform. The root package remains the compatibility anchor.

Website: https://ainyc.ai

## Workspace Map

```text
src/                  Root audit engine and CLI source
dist/                 Published build output
skills/aeo/           Claude Code / ClawHub skill asset
apps/api/             Fastify platform API skeleton
apps/worker/          Background worker skeleton
apps/web/             Vite dashboard skeleton
packages/contracts/   Shared DTOs and enums
packages/config/      Typed environment parsing
packages/db/          Database access and schema placeholder
packages/provider-gemini/ Gemini adapter placeholder
docs/                 Architecture, testing, self-hosting, ADRs
```

## Root Package Invariants

- The repo root remains the published `@ainyc/aeo-audit` package.
- Do not add `"private": true` to the root `package.json`.
- Keep the root `files` allowlist limited to `dist/`, `bin/`, `skills/`, `README.md`, and `LICENSE`.
- Do not make the root package depend on workspace packages in Phase 1.
- Keep `runAeoAudit`, `bin/aeo-audit.js`, and current publish semantics stable unless a later change explicitly updates the public contract.

## Commands

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run test:e2e
pnpm run lint
pnpm run pack:verify
pnpm run skill:verify
pnpm run typecheck:platform
pnpm run lint:platform
pnpm run docker:up
```

## Maintenance Guidance

### Root package

- Preserve audit behavior unless a change intentionally updates scoring or report contracts.
- Keep the CLI working from `node bin/aeo-audit.js` after `pnpm run build`.
- Use `src/types.ts` as the root package type surface.

### Platform packages

- Keep shared shapes in `packages/contracts` before duplicating types in API or worker code.
- Keep configuration parsing in `packages/config`.
- Keep provider-specific logic inside `packages/provider-gemini`.
- Keep API handlers thin; put orchestration in services once Phase 2 starts.

### Docs and Compose

- Update docs whenever workspace layout, packaging rules, or CI expectations change.
- Keep `compose.yaml` aligned with the placeholder startup contract documented in `docs/self-hosting.md`.

## Improvement Order

1. Protect root package compatibility and publish behavior.
2. Update shared contracts and docs.
3. Expand backend services and worker logic.
4. Extend the UI last.

## Release and Packaging Checklist

1. Run root package checks:
   - `pnpm run typecheck`
   - `pnpm run build`
   - `pnpm run test`
   - `pnpm run test:e2e`
   - `pnpm run lint`
2. Run packaging checks:
   - `pnpm run pack:verify`
   - `pnpm run skill:verify`
3. Confirm the tarball does not include workspace-only code.
4. Confirm the skill asset still ships in the tarball.

## GitHub Actions Guidance

- Keep a single publish trigger path on `main`; do not add tag triggers when tags are created by the workflow itself.
- Pass step outputs into shell commands via `env:`, not direct interpolation inside `run:`.
- Keep explicit job permissions.
- Preserve the root-package CI job even as platform-specific jobs are added.
