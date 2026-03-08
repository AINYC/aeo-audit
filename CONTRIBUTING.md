# Contributing to @ainyc/aeo-audit

## Getting Started

```bash
git clone https://github.com/AINYC/aeo-audit.git
cd aeo-audit
pnpm install
pnpm run typecheck
pnpm run build
pnpm test
```

Start with the top-level [README.md](README.md), then use:

- [docs/testing.md](docs/testing.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/self-hosting.md](docs/self-hosting.md)
- [docs/workspace-packaging.md](docs/workspace-packaging.md)

## Development

- Language: TypeScript (ESM)
- Node version: `>= 20`
- Build output: `dist/`
- Typecheck: `tsc --noEmit`
- Test runner: `tsx --test`
- Linter: ESLint v9 flat config
- Workspace root: the repository root is also the published package

## Publish and Workspace Rules

- Do not mark the root package as private.
- Keep the root `files` allowlist narrow.
- Do not introduce workspace-only code into the npm tarball.
- Preserve `skills/aeo/SKILL.md` in the published package.
- Run `pnpm run pack:verify` and `pnpm run skill:verify` when touching packaging, README, or skill files.

## Adding a New Analyzer

1. Create `src/analyzers/your-analyzer.ts` exporting a function:
   ```ts
   export function analyzeYourFactor(context) {
     // context: { $, html, url, headers, auxiliary, structuredData, textContent, pageTitle }
     return {
       score: 0-100,
       findings: [{ type: 'found'|'missing'|'info'|'timeout'|'unreachable', message: '...' }],
       recommendations: ['...'],
     }
   }
   ```
2. Add the factor to `FACTOR_DEFINITIONS` in `src/scoring.ts`
3. Wire it up in `src/index.ts` (import + add to `ANALYZER_BY_ID`)
4. Add tests in `test/analyzers/your-analyzer.test.ts`
5. Ensure all weights still sum to 100%

## Running Tests

```bash
pnpm run typecheck
pnpm run build
pnpm test
pnpm run test:e2e
pnpm run lint
pnpm run pack:verify
pnpm run skill:verify
```

## Code Style

- Functional style, no classes except `AeoAuditError`
- Use `clampScore()` from helpers for all score calculations
- Findings use types: `found`, `missing`, `info`, `timeout`, `unreachable`
- Recommendations should be actionable and specific

## Pull Requests

- Include tests for new analyzers or bug fixes
- Run `pnpm run build` if you change the CLI packaging or published entrypoints
- Run `pnpm lint` before submitting
- Run `pnpm run typecheck:platform` and `pnpm run lint:platform` when changing `apps/*` or `packages/*`
- Keep PRs focused on a single change
