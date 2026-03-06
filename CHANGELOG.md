# Changelog

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
