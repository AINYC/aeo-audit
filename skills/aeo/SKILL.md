---
name: aeo
description: AEO (Answer Engine Optimization) toolkit. Audit websites across 13 AI citation factors, fix issues in source code, generate llms.txt files, monitor score changes, or validate structured data. Subcommands: audit, fix, llms-generate, monitor, schema-validate.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
  - Bash(curl *)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
argument-hint: "<audit|fix|llms-generate|monitor|schema-validate> <url> [options]"
---

# AEO Toolkit

Parse the first argument to determine the subcommand, then follow the corresponding section below. Remaining arguments are passed through as `$URL` and `$OPTIONS`.

---

## `audit` — Run a comprehensive AEO audit

1. Run: `npx @ainyc/aeo-audit@latest $URL $OPTIONS --format json`
2. Parse the JSON output
3. Present results as a formatted report:
   - **Overall Grade** (letter grade + numeric score out of 100)
   - **Summary** (1-2 sentence overview)
   - **Factor Breakdown** table: Factor | Weight | Score | Grade | Status
   - **Top 3 Strengths** with specific evidence from findings
   - **Top 3 Opportunities** with actionable recommendations
   - **Metadata** (fetch time, word count, auxiliary file availability)
4. If the user is working in a codebase, offer to fix specific issues found

### Grading Scale

A+ (97+): Exceptional | A/A- (90-96): Strong | B (80-89): Good | C (70-79): Moderate | D (60-69): Weak | F (<60): Critical

### 13 Scoring Factors

Structured Data, Content Depth, AI-Readable Content, E-E-A-T Signals, FAQ Content, Citations & Authority, Schema Completeness, Entity Consistency, Content Freshness, Content Extractability, Definition Blocks, AI Crawler Access, Named Entities.

---

## `fix` — Audit and fix AEO issues in the codebase

1. Run: `npx @ainyc/aeo-audit@latest $URL --format json`
2. Identify factors with status `partial` or `fail` (score < 70)
3. For each failing factor, search the codebase and apply fixes:

   **Structured Data / Schema Completeness:** Find JSON-LD blocks, add missing schema types or properties.

   **AI-Readable Content:** Create `public/llms.txt` and `public/llms-full.txt` if missing. Add `<link rel="alternate" type="text/markdown" href="/llms.txt">` to HTML head.

   **AI Crawler Access:** Add Allow directives for GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended to `robots.txt`.

   **E-E-A-T:** Add `<meta name="author">`, Person schema, links to /privacy, /terms, /about.

   **FAQ Content:** Add FAQPage schema, `<details>/<summary>` blocks.

   **Content Freshness:** Update `dateModified` in structured data, sitemap `lastmod` entries.

4. Re-run the audit to verify improvements
5. Report changes made and new score

**Rules:** Never remove existing content — only add and enhance. Preserve code style. Ask the user if unsure.

---

## `llms-generate` — Generate llms.txt and llms-full.txt

### If URL provided

1. Run: `npx @ainyc/aeo-audit@latest $URL --format json --factors ai-readable-content`
2. Fetch and analyze existing content
3. Generate improved llms.txt (~200 words) and llms-full.txt (~800+ words)

### If no URL (current project)

1. Search the codebase for content: page files, JSON-LD, README, package.json
2. Extract: business name, services, team info, contact, FAQs, location
3. Generate both files

### llms.txt Format

```markdown
# [Business Name]

> [1-2 sentence summary]

## About
## Services
## How It Works
## Contact
```

### llms-full.txt Format

Expand every section with full detail: complete service descriptions, FAQ pairs, team bios, industry context, service area coverage.

After generating, add `<link rel="alternate" type="text/markdown" href="/llms.txt">` to the HTML head if not present.

---

## `monitor` — Track score changes or compare URLs

### Single URL (track changes)

1. Run: `npx @ainyc/aeo-audit@latest $URL --format json`
2. Check `.aeo-audit-history/` for previous results
3. If previous exists, show change report: overall delta, per-factor deltas, status changes
4. Save result to `.aeo-audit-history/<domain>-<timestamp>.json`

### Two URLs (competitor comparison)

Parse `--compare <url2>` from options.

1. Audit both URLs
2. Present side-by-side comparison table: Factor | Your Score | Competitor | Delta
3. Highlight advantages and recommend improvements to close gaps

Use directional indicators: ↑ improved, ↓ regressed, → unchanged. Highlight moves > 10 points.

---

## `schema-validate` — Validate JSON-LD structured data

1. Run: `npx @ainyc/aeo-audit@latest $URL --format json --factors structured-data,schema-completeness,entity-consistency`
2. Present a detailed schema report:
   - Schema types found (each @type with property count)
   - Property completeness per type (% of recommended properties)
   - Missing recommended properties
   - Entity consistency (name alignment across schema, title, og:title)
3. Provide corrected/enhanced JSON-LD examples for issues found
4. Show optimal JSON-LD template for the detected business type

### Schema Type Checklists

- **LocalBusiness:** name, address, telephone, openingHours, priceRange, image, url, geo, areaServed, sameAs
- **FAQPage:** mainEntity with >= 3 Q&A pairs, each answer >= 15 words
- **HowTo:** name, step (>= 3), each with name and text
- **Organization:** name, logo, contactPoint, sameAs, foundingDate, url, description

---

## Error Handling

- If npx fails, suggest: `npm install -g @ainyc/aeo-audit` then retry
- If the target URL is unreachable, report the specific error
- If the URL returns non-HTML, explain and suggest the correct URL
