# Product Plan

## Goal

Build on top of `@ainyc/aeo-audit` to create the most comprehensive open-source, self-hostable AEO analysis and monitoring tool while keeping the existing audit library and CLI stable.

## Phase 1 Scope

- Preserve the root package and publish workflow
- Add a workspace skeleton for API, worker, web, and shared packages
- Add platform architecture and maintenance documentation
- Add CI checks that protect npm packaging and skill distribution
- Add Docker Compose for a placeholder local stack

## Product Direction

- OSS self-hosting first
- SaaS-ready architecture later
- Gemini is the first provider
- Technical readiness and answer visibility remain separate score families
- Manual keyword import and manual competitor setup in the first product release
- The monitoring app is the primary product surface; the audit CLI remains a supporting developer and CI tool, not the main user workflow

## Planned Phases

### Phase 1

- Docs, architecture diagrams, workspace scaffolding, packaging guards

### Phase 2

- Postgres schema, API skeleton behavior, worker lifecycle, bootstrap flow

### Phase 3

- Gemini answer visibility execution, quotas, retries, persistence

### Phase 4

- Site audit orchestration, trend aggregation, partial-result handling

### Phase 5

- Minimal Vite dashboard wired to stable API contracts

### Phase 6

- Export flows, self-host polish, CI smoke coverage, release hardening
