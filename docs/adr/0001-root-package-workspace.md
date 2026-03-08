# ADR 0001: Keep the Root Package as the Workspace Root

## Decision

The repository root remains the published `@ainyc/aeo-audit` package while also acting as the `pnpm` workspace root for platform code.

## Why

- avoids breaking the current npm package
- preserves the existing CLI path
- keeps publish flow stable
- allows gradual platform expansion

## Consequences

- packaging guards are mandatory
- workspace code must stay outside the root package `files` allowlist
