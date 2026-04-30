# @ainyc/aeo-audit

The most comprehensive open-source Answer Engine Optimization (AEO) audit tool. Scores any website across 14 ranking factors that determine whether AI answer engines — ChatGPT, Perplexity, Gemini, Claude — will cite your content.

Website: [ainyc.ai](https://ainyc.ai)

## Quick Start

```bash
npx @ainyc/aeo-audit https://example.com
```

## Local Development

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run lint

# Smoke test the compiled CLI from this repo
node bin/aeo-audit.js https://example.com --format json
```

The package source lives in `src/*.ts` and publishes compiled ESM plus declarations from `dist/`.

## Why AEO?

AI answer engines are replacing traditional search for millions of queries. Getting cited by ChatGPT or Perplexity requires different signals than ranking in Google:

- **Structured data** (JSON-LD) with FAQPage schema shows 2.7x higher citation rates
- **llms.txt** files help AI systems understand your site at a glance
- **E-E-A-T signals** (author credentials, trust pages) determine citation trustworthiness
- **Content extractability** — clean, well-structured content gets cited; paywalled content doesn't

## 14 Scoring Factors

| Factor | Weight | What It Checks |
|--------|--------|---------------|
| Structured Data (JSON-LD) | 12% | Presence of LocalBusiness, FAQPage, Service, HowTo schemas |
| Content Depth | 10% | Word count, heading hierarchy, paragraph structure, lists |
| AI-Readable Content | 10% | llms.txt, llms-full.txt, robots.txt, sitemap.xml availability |
| E-E-A-T Signals | 8% | Author meta, Person schema credentials, trust pages, reviews |
| FAQ Content | 8% | FAQPage schema, details/summary blocks, question-style headings |
| Citations & Authority | 8% | External links, authoritative domains, sameAs references |
| Schema Completeness | 8% | Property depth per schema type vs recommended properties |
| Entity Consistency | 7% | Name consistency across schema, title, og:title; contact alignment |
| Content Freshness | 7% | dateModified, Last-Modified header, sitemap lastmod, copyright year |
| Content Extractability | 6% | Content-to-boilerplate ratio, citation-ready blocks, paywall detection |
| Definition Blocks | 6% | "What is", "How to" headings, step lists, HowTo schema, dl elements |
| Named Entities | 6% | Brand mentions, knowsAbout/founder signals, proper noun density |
| Schema Validity | 5% | Duplicate singleton @types, JSON parse errors, empty JSON-LD blocks |
| AI Crawler Access | 4% | Per-bot robots.txt rules for GPTBot, ClaudeBot, PerplexityBot, etc. |

**Optional:** Geographic Signals (7%) — LocalBusiness geo data, address, areaServed. Enable with `--include-geo`.

## CLI Usage

```bash
# Colored terminal output (default)
npx @ainyc/aeo-audit https://example.com

# JSON output (for CI/CD)
npx @ainyc/aeo-audit https://example.com --format json

# Markdown report
npx @ainyc/aeo-audit https://example.com --format markdown

# Run specific factors only
npx @ainyc/aeo-audit https://example.com --factors structured-data,faq-content

# Validate JSON-LD blocks for parse errors and duplicate singleton @types
# (catches issues like duplicate FAQPage that Google flags as invalid)
npx @ainyc/aeo-audit https://example.com --factors schema-validity

# Include geographic signals
npx @ainyc/aeo-audit https://example.com --include-geo

# Include optional agent skill exposure factor
npx @ainyc/aeo-audit https://example.com --include-agent-skills
```

### Platform Detection Mode

Detect what platform, CMS, framework, or static site generator a website is built on. Useful for competitor research, lead qualification, and triage before an audit.

```bash
# Identify the stack (WordPress, Webflow, Shopify, Next.js, Vercel, etc.)
npx @ainyc/aeo-audit https://example.com --detect-platform

# JSON for programmatic use
npx @ainyc/aeo-audit https://example.com --detect-platform --format json

# Only show high-confidence matches
npx @ainyc/aeo-audit https://example.com --detect-platform --min-confidence high
```

The detector inspects HTML, response headers, `<meta name="generator">`, script and link sources, and platform-specific globals to fingerprint:

- **CMS:** WordPress, Drupal, Joomla, Ghost, HubSpot, Craft CMS, Sanity, Contentful, Notion
- **Site builders:** Wix, Squarespace, Webflow, Framer, Carrd, Bubble
- **E-commerce:** Shopify, WooCommerce, BigCommerce, Magento, PrestaShop
- **Frameworks:** Next.js, Nuxt, Gatsby, Remix, Astro, SvelteKit, Angular, Vue, React, Ember, Qwik
- **Static site generators:** Hugo, Jekyll, Eleventy, Hexo, Docusaurus, MkDocs
- **Hosting / CDN:** Vercel, Netlify, Cloudflare, GitHub Pages, Fastly, AWS CloudFront

Each detected platform is reported with a confidence bucket (`high`, `medium`, `low`), a numeric score, an optional version, and the list of signals that matched. When no CMS, site builder, or e-commerce platform is found, the report flags the site as `custom-built` (framework and hosting fingerprints are still surfaced for context). Exit code is `0` when at least one platform is detected, `1` otherwise.

#### Batch detection

Pass `--urls` to fingerprint many sites in a single run. Pages are fetched with bounded concurrency (5 in flight by default; tune with `--concurrency`).

```bash
# From a file (one URL per line; # comments and blank lines are skipped)
npx @ainyc/aeo-audit --detect-platform --urls urls.txt

# Inline comma-separated list
npx @ainyc/aeo-audit --detect-platform --urls https://a.com,https://b.com,https://c.com

# From stdin
cat urls.txt | npx @ainyc/aeo-audit --detect-platform --urls -

# JSON for downstream processing
npx @ainyc/aeo-audit --detect-platform --urls urls.txt --format json
```

Per-URL fetch errors don't abort the batch — each entry is reported with `status: 'success'` or `status: 'error'`. Exit code is `0` when at least one URL succeeded, `1` otherwise.

### Sitemap Mode

Audit every page discovered from the site's sitemap with bounded concurrency (5 in flight):

```bash
# Auto-discover /sitemap.xml
npx @ainyc/aeo-audit https://example.com --sitemap

# Provide an explicit sitemap URL
npx @ainyc/aeo-audit https://example.com --sitemap https://example.com/sitemap.xml

# Cap the number of pages (default 200, sorted by sitemap priority)
npx @ainyc/aeo-audit https://example.com --sitemap --limit 50

# Skip per-page output and show only cross-cutting issues
npx @ainyc/aeo-audit https://example.com --sitemap --top-issues
```

When the sitemap has more URLs than `--limit`, the run audits the highest-priority pages and prints a notice to stderr listing how many were skipped and how to audit them all.

### Flag Reference

| Flag | Description |
|------|-------------|
| `--format <type>` | Output format: `text` (default), `json`, `markdown` |
| `--factors <list>` | Comma-separated factor IDs to run (runs all if omitted) |
| `--include-geo` | Include the optional geographic signals factor |
| `--include-agent-skills` | Include the optional agent skill exposure factor |
| `--sitemap [url]` | Audit all pages from the sitemap (auto-discovers `/sitemap.xml` or uses an explicit URL) |
| `--limit <n>` | Max pages to audit in sitemap mode (default 200, sorted by sitemap priority) |
| `--top-issues` | In sitemap mode, skip per-page output and show only cross-cutting issues |
| `--detect-platform` | Identify the platform/CMS/framework powering the site instead of running an audit |
| `--urls <src>` | In `--detect-platform` mode, run on multiple URLs. `<src>` is a file path (one URL per line), a comma-separated list, or `-` for stdin |
| `--concurrency <n>` | In `--detect-platform` batch mode, max in-flight fetches (default 5) |
| `--min-confidence <lvl>` | In platform-detect mode, only report matches at or above this level: `low` (default), `medium`, `high` |
| `-h`, `--help` | Show the help message |

Exit code `0` for score >= 70, `1` for < 70 (CI-friendly). In sitemap mode the exit code is based on the aggregate score.

## Programmatic Usage

```ts
import { runAeoAudit } from '@ainyc/aeo-audit'

const report = await runAeoAudit('https://example.com', {
  includeGeo: false,        // Include geographic signals (default: false)
  factors: null,             // Run all factors (or pass array of factor IDs)
})

console.log(report.overallGrade) // 'A+'
console.log(report.overallScore) // 98
console.log(report.factors)      // Array of factor results with scores, findings, recommendations
```

TypeScript declaration files are included automatically.

## Claude Code / ClawHub Skill

This package now ships one umbrella skill source at `skills/aeo/SKILL.md`.

Command: `/aeo`

Modes:

- `audit` for grading and diagnosis
- `fix` for code changes after an audit
- `schema` for JSON-LD validation
- `llms` for `llms.txt` and `llms-full.txt`
- `monitor` for before/after tracking or competitor comparisons

Examples:

- `/aeo audit https://example.com`
- `/aeo fix https://example.com`
- `/aeo schema https://example.com`
- `/aeo llms https://example.com`
- `/aeo monitor https://site-a.com --compare https://site-b.com`

ClawHub package: [arberx/aeo](https://clawhub.ai/arberx/aeo)

If you are testing the skill from this repository instead of the published package, build first and use the local CLI:

```bash
pnpm run build
node bin/aeo-audit.js https://example.com --format json
```

### Install Skills

```bash
# Personal install
git clone https://github.com/AINYC/aeo-audit.git /tmp/aeo-audit
cp -r /tmp/aeo-audit/skills/aeo ~/.claude/skills/

# Or project-level
cp -r /tmp/aeo-audit/skills/aeo .claude/skills/
```

## Grading Scale

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 97-100 | Exceptional AEO readiness |
| A / A- | 90-96 | Strong foundation |
| B+/B/B- | 80-89 | Good with clear gaps |
| C+/C/C- | 70-79 | Moderate, needs work |
| D+/D/D- | 60-69 | Weak |
| F | <60 | Critical |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
