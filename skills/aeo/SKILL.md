---
name: aeo
description: Run AEO audits, fix site issues, validate schema, generate llms.txt, and compare sites.
homepage: https://ainyc.ai
repository: https://github.com/AINYC/aeo-audit
allowed-tools:
  - Bash(npx @ainyc/aeo-audit@1 *)
  - Read
  - Glob
  - Grep
  - Write(llms.txt)
  - Write(llms-full.txt)
  - Write(robots.txt)
---

# AEO

Website: [ainyc.ai](https://ainyc.ai)

One skill for audit, fixes, schema, llms.txt, and monitoring workflows.

## Command

Always use the published package:

```bash
npx @ainyc/aeo-audit@1 "<url>" [flags] --format json
```

## Argument Safety

**Never interpolate user input directly into shell commands.** Always:
1. Validate that URLs match `https://` or `http://` and contain no shell metacharacters.
2. Quote every argument individually (e.g., `npx @ainyc/aeo-audit@1 "https://example.com" --format json`).
3. Pass flags as separate, literal tokens — never construct command strings from raw user text.
4. Reject arguments containing characters like `;`, `|`, `&`, `$`, `` ` ``, `(`, `)`, `{`, `}`, `<`, `>`, or newlines.

## Modes

- `audit`: grade and diagnose a site
- `fix`: apply code changes after an audit
- `schema`: validate JSON-LD and entity consistency
- `llms`: create or improve `llms.txt` and `llms-full.txt`
- `monitor`: compare changes over time or benchmark competitors

If no mode is provided, default to `audit`.

## Examples

- `audit https://example.com`
- `audit https://example.com --sitemap`
- `audit https://example.com --sitemap --limit 10`
- `audit https://example.com --sitemap --top-issues`
- `fix https://example.com`
- `schema https://example.com`
- `llms https://example.com`
- `monitor https://site-a.com --compare https://site-b.com`

## Mode Selection

- If the first argument is one of `audit`, `fix`, `schema`, `llms`, or `monitor`, use that mode.
- If no explicit mode is given, infer the intent from the request and default to `audit`.

## Audit

Use for broad requests such as "audit this site" or "why am I not being cited?"

1. Run:
   ```bash
   npx @ainyc/aeo-audit@1 "<url>" [flags] --format json
   ```
2. Return:
   - Overall grade and score
   - Short summary
   - Factor breakdown
   - Top strengths
   - Top fixes
   - Metadata such as fetch time and auxiliary file availability

### Sitemap Mode

Use `--sitemap` to audit all pages discovered from the site's sitemap:

```bash
npx @ainyc/aeo-audit@1 "<url>" --sitemap --format json
npx @ainyc/aeo-audit@1 "<url>" --sitemap https://example.com/sitemap.xml --format json
npx @ainyc/aeo-audit@1 "<url>" --sitemap --limit 10 --format json
npx @ainyc/aeo-audit@1 "<url>" --sitemap --top-issues --format json
```

Flags:
- `--sitemap [url]` — auto-discover `/sitemap.xml` or provide an explicit URL
- `--limit <n>` — cap pages audited (sorted by sitemap priority)
- `--top-issues` — skip per-page output, show only cross-cutting patterns

Returns:
- Per-page scores and grades
- Cross-cutting issues (factors failing across multiple pages)
- Aggregate score and grade
- Prioritized fixes ranked by site-wide impact

## Fix

Use when the user wants code changes applied after the audit.

1. Run:
   ```bash
   npx @ainyc/aeo-audit@1 "<url>" [flags] --format json
   ```
2. Find factors with status `partial` or `fail`.
3. Apply targeted fixes in the current codebase.
4. Prioritize:
   - Structured data and schema completeness
   - `llms.txt` and `llms-full.txt`
   - `robots.txt` crawler access
   - E-E-A-T signals
   - FAQ markup
   - freshness metadata
5. Re-run the audit and report the score delta.

Rules:
- Always explain proposed changes and get user confirmation before editing files.
- Do not remove existing schema or content unless the user asks.
- Preserve existing code style and patterns.
- If a fix is ambiguous or high-risk, explain the tradeoff before editing.

## Schema

Use when the request is specifically about JSON-LD or schema quality.

1. Run:
   ```bash
   npx @ainyc/aeo-audit@1 "<url>" [flags] --format json --factors structured-data,schema-completeness,entity-consistency
   ```
2. Report:
   - Schema types found
   - Property completeness by type
   - Missing recommended properties
   - Entity consistency issues
3. Provide corrected JSON-LD examples when useful.

Checklist:
- `LocalBusiness`: name, address, telephone, openingHours, priceRange, image, url, geo, areaServed, sameAs
- `FAQPage`: mainEntity with at least 3 Q&A pairs
- `HowTo`: name and at least 3 steps
- `Organization`: name, logo, contactPoint, sameAs, foundingDate, url, description

## llms.txt

Use when the user wants `llms.txt` or `llms-full.txt` created or improved.

If a URL is provided:
1. Run:
   ```bash
   npx @ainyc/aeo-audit@1 "<url>" [flags] --format json --factors ai-readable-content
   ```
2. Inspect existing AI-readable files if present.
3. Extract key content from the site.
4. Generate improved `llms.txt` and `llms-full.txt`.

If no URL is provided:
1. Inspect the current project.
2. Extract business name, services, FAQs, contact info, and metadata.
3. Generate both files from local sources.

After generation:
- Add `<link rel="alternate" type="text/markdown" href="/llms.txt">` when appropriate.
- Suggest adding the files to the sitemap.

## Monitor

Use when the user wants progress tracking or a competitor comparison.

Single URL:
1. Run the audit.
2. Compare against prior results in `.aeo-audit-history/` if present.
3. Show overall and per-factor deltas.
4. Save the current result.

Comparison mode:
1. Parse `--compare <url2>`.
2. Audit both URLs.
3. Show side-by-side factor deltas.
4. Highlight advantages, weaknesses, and priority gaps.

## Behavior

- If the task needs a deployed site and no URL is provided, ask for the URL.
- If the task is diagnosis only, do not edit files.
- If the task is a fix request, make edits and verify with a rerun when possible.
- If the URL is unreachable or not HTML, report the exact failure.
- Prefer concise, evidence-based recommendations over generic SEO advice.
