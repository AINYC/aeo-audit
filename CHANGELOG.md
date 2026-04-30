# Changelog

## 1.7.0 (2026-04-30)

### Added
- New `schema-validity` analyzer (weight 5) that flags page-level JSON-LD problems missed by existing factors:
  - Duplicate singleton `@type`s on a page (e.g., two `FAQPage` blocks — Google flags as "Duplicate field" and invalidates rich results)
  - JSON syntax errors in any `<script type="application/ld+json">` block (previously silently swallowed)
  - Empty / whitespace-only JSON-LD `<script>` blocks
- `extractJsonLdBlocks()` helper exported from `analyzers/helpers.js` for richer per-block introspection (index, parse error, top-level `@type`s)

### Behavior
- When the validator finds a structural error (duplicate singleton or JSON parse error), the factor's score is capped at `69` so the issue surfaces in text-mode top recommendations regardless of how many other factors are also failing — schema errors must be visible irrespective of the numeric score.

## 1.0.3 (2026-03-06)

### Changed
- Replaced the split skill set with one umbrella `aeo` skill covering audit, fix, schema, llms, and monitor modes
- Made `skills/aeo/SKILL.md` the canonical skill source for both npm packaging and ClawHub publishing
- Included the umbrella skill source in the npm package

## 1.0.0 (2026-03-03)

### Added
- Initial release extracted from AINYC website repo
- 13 core scoring factors + 1 optional (geographic signals)
- 4 new analyzers: E-E-A-T Signals, AI Crawler Access, Schema Completeness, Content Extractability
- CLI with text, JSON, and markdown output formats
- 5 Claude Code skills: aeo-audit, aeo-fix, aeo-schema-validate, aeo-llms-generate, aeo-monitor
- CI/CD with GitHub Actions
