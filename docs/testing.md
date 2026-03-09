# Testing Guide

## Root Package Checks

Run these before changing publish-sensitive code:

```bash
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run test:e2e
pnpm run lint
pnpm run pack:verify
pnpm run skill:verify
```

## Workspace Skeleton Checks

```bash
pnpm run typecheck:platform
pnpm run test:platform
pnpm run lint:platform
```

## CI Mapping

- `ci.yml` test job:
  - `typecheck`
  - `build`
  - `lint`
  - `test`
  - `test:e2e`
- `ci.yml` packaging job:
  - `build`
  - `pack:verify`
  - `skill:verify`
- `ci.yml` platform-skeleton job:
  - `typecheck:platform`
  - `test:platform`
  - `lint:platform`
- `publish.yml`:
  - version bump detection
  - root package verification
  - npm publish
  - git tag creation

## Packaging Verification

`pack:verify` must guarantee:

- included:
  - `dist/**`
  - `bin/aeo-audit.js`
  - `skills/aeo/SKILL.md`
  - `README.md`
  - `LICENSE`
- excluded:
  - `apps/**`
  - `packages/**`
  - `docs/**`
  - `.github/**`

## Skill Verification

`skill:verify` must guarantee:

- the skill file exists
- frontmatter parses
- the local verification path remains documented:
  - `pnpm run build`
  - `node bin/aeo-audit.js ...`

## Docker Smoke Test

```bash
cp .env.example .env
pnpm install
pnpm run docker:up
curl http://localhost:3000/health
```

The web app should render a placeholder landing page at `http://localhost:4173`.

## Release Verification Checklist

1. Run the full root package check set.
2. Run the workspace skeleton checks.
3. Confirm `npm pack --dry-run --json` includes the skill asset.
4. Confirm the tarball excludes workspace-only code.
5. Confirm the local CLI still works from `node bin/aeo-audit.js`.
