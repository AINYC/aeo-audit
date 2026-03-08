# Architecture

## Overview

The repository is structured so the current published package remains stable at the repo root while the platform grows around it. The root package continues to own fetch, analyzers, scoring, formatters, the CLI, and the skill asset. New platform services are added under `apps/*` and `packages/*`.

## Component Diagram

```mermaid
flowchart LR
  User["Developer / Analyst"] --> Web["apps/web\nVite SPA"]
  User --> CLI["Root CLI\nbin/aeo-audit.js"]
  Web --> API["apps/api\nFastify API"]
  API --> DB["Postgres"]
  API --> Queue["pg-boss jobs"]
  Queue --> Worker["apps/worker"]
  Worker --> Gemini["packages/provider-gemini\nGemini API"]
  Worker --> Core["Root package\n@ainyc/aeo-audit"]
  CLI --> Core
  Core --> Target["Audited websites"]
  Worker --> DB
  Skills["skills/aeo/SKILL.md"] --> Repo["Git repo checkout"]
  Skills --> Npm["npm package tarball"]
  Npm --> CLI
```

## Run Flow

```mermaid
sequenceDiagram
  actor Analyst
  participant Web
  participant API
  participant DB
  participant Queue as pg-boss
  participant Worker
  participant Gemini
  participant Core as @ainyc/aeo-audit

  Analyst->>Web: Trigger manual run
  Web->>API: POST /api/projects/:id/runs
  API->>DB: Insert run (queued)
  API->>Queue: Enqueue job
  API-->>Web: Run accepted

  Queue->>Worker: Deliver job
  Worker->>Gemini: executeTrackedQuery()
  Gemini-->>Worker: Answer + grounding data
  Worker->>DB: Persist query and citation snapshots
  Worker->>Core: runSiteAudit() later phase
  Core-->>Worker: Technical report
  Worker->>DB: Update aggregates and run status

  Web->>API: GET /api/runs/:id
  API->>DB: Read run and snapshots
  API-->>Web: Normalized result
```

## Service Boundaries

- Root package: technical audit engine, CLI, formatters, TypeScript report types
- API: HTTP surface, validation, orchestration, read APIs
- Worker: jobs, provider execution, retries, future site audits
- Web: dashboard and bootstrap/setup UX
- Contracts: shared DTOs, enums, and validation shapes
- Config: typed environment parsing
- Provider Gemini: provider adapter and normalization layer
- DB: schema and database access layer

## Design Constraints

- The repo root must remain publishable to npm
- Skills must keep shipping through the npm tarball and repository checkout
- Platform-only code must not leak into the published tarball
- Future hosted deployment should be possible without rewriting the core data model

## Score Families

- Technical readiness: root audit engine and future site-audit rollups
- Answer visibility: provider-driven keyword tracking and citation outcomes

These remain separate to avoid mixing technical readiness with live-answer visibility.
