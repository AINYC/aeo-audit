---
name: aeo-audit
description: Run AEO audits, fix site issues, validate schema, generate llms.txt, and compare sites.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
  - Bash(curl *)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
context: fork
argument-hint: <url> [--compare <url2>]
---

# AEO

Website: [ainyc.ai](https://ainyc.ai)

Audit and improve how AI systems understand, extract, and cite a website.

## What It Covers

- Full AEO audits and score reviews
- Code fixes for weak or missing AEO signals
- JSON-LD and schema validation
- `llms.txt` and `llms-full.txt` generation
- Before-vs-after tracking and competitor comparisons

## Common Requests

- `Audit https://example.com`
- `Fix AEO issues for https://example.com in this repo`
- `Validate schema for https://example.com`
- `Generate llms.txt for this project`
- `Compare https://site-a.com --compare https://site-b.com`

## Mode Selection

- Use `Audit` for grading, diagnosis, and benchmarking.
- Use `Fix` when the user wants code changes.
- Use `Schema` for JSON-LD, missing properties, or entity consistency.
- Use `llms.txt` when the user wants AI-readable markdown files.
- Use `Monitor` for progress tracking or competitor comparisons.

## Audit

Use for broad requests such as "audit this site" or "why am I not being cited?"

1. Run:
   ```bash
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json
   ```
2. Return:
   - Overall grade and score
   - Short summary
   - Factor breakdown
   - Top strengths
   - Top fixes
   - Metadata such as fetch time and auxiliary file availability

## Fix

Use when the user wants code changes applied after the audit.

1. Run:
   ```bash
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json
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
- Do not remove existing schema or content unless the user asks.
- Preserve existing code style and patterns.
- If a fix is ambiguous or high-risk, explain the tradeoff before editing.

## Schema

Use when the request is specifically about JSON-LD or schema quality.

1. Run:
   ```bash
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json --factors structured-data,schema-completeness,entity-consistency
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
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json --factors ai-readable-content
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
- If `npx` fails, suggest `npm install -g @ainyc/aeo-audit`.
- If the URL is unreachable or not HTML, report the exact failure.
- Prefer concise, evidence-based recommendations over generic SEO advice.
