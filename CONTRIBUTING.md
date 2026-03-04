# Contributing to @ainyc/aeo-audit

## Getting Started

```bash
git clone https://github.com/AINYC/aeo-audit.git
cd aeo-audit
pnpm install
pnpm test
```

## Development

- **Language:** JavaScript (ESM), no TypeScript
- **Node version:** >= 20
- **Test runner:** `node --test`
- **Linter:** ESLint v9 flat config

## Adding a New Analyzer

1. Create `src/analyzers/your-analyzer.js` exporting a function:
   ```javascript
   export function analyzeYourFactor(context) {
     // context: { $, html, url, headers, auxiliary, structuredData, textContent, pageTitle }
     return {
       score: 0-100,
       findings: [{ type: 'found'|'missing'|'info'|'timeout'|'unreachable', message: '...' }],
       recommendations: ['...'],
     }
   }
   ```
2. Add the factor to `FACTOR_DEFINITIONS` in `src/scoring.js`
3. Wire it up in `src/index.js` (import + add to `ANALYZER_BY_ID`)
4. Add tests in `test/analyzers/your-analyzer.test.js`
5. Ensure all weights still sum to 100%

## Running Tests

```bash
pnpm test
```

## Code Style

- Functional style, no classes except `AeoAuditError`
- Use `clampScore()` from helpers for all score calculations
- Findings use types: `found`, `missing`, `info`, `timeout`, `unreachable`
- Recommendations should be actionable and specific

## Pull Requests

- Include tests for new analyzers or bug fixes
- Run `pnpm lint` before submitting
- Keep PRs focused on a single change
