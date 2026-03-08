# Workspace Packaging

## Purpose

This repository is both:

- the workspace root for platform apps and packages
- the published root package for `@ainyc/aeo-audit`

That is intentional. The existing audit engine and CLI stay publishable while the platform grows around them.

## Packaging Rules

- The root package must remain publishable with `npm publish` from the repo root.
- The root `files` allowlist must stay narrow.
- Platform directories must never enter the published tarball.
- Skills must continue shipping through the npm tarball and repository checkout.

## Required Tarball Contents

- `dist/**`
- `bin/aeo-audit.js`
- `skills/aeo/SKILL.md`
- `README.md`
- `LICENSE`

## Forbidden Tarball Contents

- `apps/**`
- `packages/**`
- `docs/**`
- `.github/**`

## Verification Commands

```bash
pnpm run build
pnpm run pack:verify
pnpm run skill:verify
```

## Publishing Notes

- Publish remains rooted at `package.json` in the repository root.
- The workflow remains version-gated on changes to the root package version.
- There is no separate skill publish workflow in Phase 1.
