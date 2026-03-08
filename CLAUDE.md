# CLAUDE.md

## Project Overview

@ainyc/aeo-audit — an open-source AEO (Answer Engine Optimization) audit engine and single umbrella Claude Code / ClawHub skill. Scores websites across 13 ranking factors that determine AI citation.

Website: https://ainyc.ai

## Tech Stack

- **Language:** TypeScript (ESM)
- **Runtime:** Node.js >= 20
- **Package manager:** pnpm
- **HTML parsing:** Cheerio
- **Build:** TypeScript compiler to `dist/`
- **Typecheck:** `tsc --noEmit`
- **Test runner:** `tsx --test`
- **Linter:** ESLint v9 flat config

## Commands

```bash
pnpm install    # Install dependencies
pnpm run typecheck  # Static typecheck
pnpm run build      # Compile src/*.ts to dist/
pnpm test           # Run all tests
pnpm lint           # Run linter
```

## Key Files

```
src/
  index.ts           # Main entry: runAeoAudit(url, options)
  scoring.ts         # Factor definitions, weights, grade calculation
  fetch-page.ts      # URL fetching with SSRF protection
  errors.ts          # AeoAuditError class
  cli.ts             # CLI argument parsing
  formatters/        # json, markdown, text output formatters
  analyzers/         # 14 analyzer modules (13 core + 1 optional)
  types.ts           # Shared audit/report TypeScript types
dist/                # Compiled publishable ESM output
bin/
  aeo-audit.js       # CLI entry point -> dist/cli.js
skills/aeo/          # Single umbrella Claude Code / ClawHub skill
test/                # Unit and integration tests
```

## Architecture

- Each analyzer receives a context object `{ $, html, url, headers, auxiliary, structuredData, textContent, pageTitle }` and returns `{ score, findings, recommendations }`
- Scores are weighted and normalized in `scoring.ts`; weights sum to 100% for active factors
- Geographic signals is optional (excluded by default); when included, weights renormalize
- The `--factors` flag allows running a subset of analyzers
- SSRF protection blocks private IPs and hostnames in `fetch-page.ts`
- Published entrypoints resolve to compiled `dist/` output; run `pnpm run build` before local CLI smoke tests

## Code Conventions

- Functional style, no classes except AeoAuditError
- Always use `clampScore()` for score calculations
- Findings types: `found`, `missing`, `info`, `timeout`, `unreachable`
- Unused vars starting with `_` are ignored by ESLint

## GitHub Actions Conventions

- **Single trigger path per release flow.** If the workflow auto-creates a tag, do not also trigger on that tag pattern — the self-pushed tag will re-fire the workflow, causing a duplicate publish that fails with 403 on npm.
- **Never interpolate step outputs directly into `run:` blocks.** Use an `env:` block to pass values into shell scripts: `env: { VERSION: "${{ steps.x.outputs.version }}" }` then reference `$VERSION` in the script. Direct `${{ }}` interpolation in `run:` is a script-injection vector.
- **Scope permissions to the minimum required per job.** If only one step needs `contents: write` (e.g., pushing a tag), prefer splitting it into a separate job with its own permissions block rather than elevating the entire job.
- **Declare explicit `permissions` on every job.** Omitting the `permissions` block inherits the repository default, which may be `write-all`. Always declare at minimum `contents: read`.
