---
name: aeo-audit
description: End-to-end AEO toolkit for auditing, fixing code, validating schema, generating llms.txt files, and monitoring changes or competitor gaps. Use when improving AI citation readiness or diagnosing why a site is not being cited.
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

# AEO Audit

Website: [ainyc.ai](https://ainyc.ai)

Use this single skill for all AEO workflows. Infer the mode from the user's request.

## Modes

### 1. Audit

Use for general AEO checks, score reviews, competitor benchmarking, or "why am I not getting cited?" requests.

Steps:
1. Run:
   ```
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json
   ```
2. Parse the JSON output.
3. Present:
   - Overall grade and score
   - Short summary
   - Factor breakdown table
   - Top strengths
   - Top opportunities
   - Metadata such as fetch time, word count, and auxiliary file availability

### 2. Fix

Use when the user wants changes applied to the current codebase after an audit.

Steps:
1. Run:
   ```
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json
   ```
2. Identify factors with status `partial` or `fail`.
3. Search the codebase and apply targeted fixes.
4. Prioritize:
   - Structured data and schema completeness
   - llms.txt and llms-full.txt
   - robots.txt crawler access
   - E-E-A-T signals
   - FAQ markup
   - freshness metadata
5. Re-run the audit and report the score delta.

Rules:
- Never remove existing schema or content unless the user asks.
- Preserve code style and patterns.
- If the fix is ambiguous or high-risk, explain the tradeoff before editing.

### 3. Schema Validation

Use when the request is specifically about JSON-LD, schema types, or entity consistency.

Steps:
1. Run:
   ```
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json --factors structured-data,schema-completeness,entity-consistency
   ```
2. Report:
   - Schema types found
   - Property completeness by type
   - Missing recommended properties
   - Entity consistency issues
3. Provide corrected JSON-LD examples when needed.

Checklist:
- LocalBusiness: name, address, telephone, openingHours, priceRange, image, url, geo, areaServed, sameAs
- FAQPage: mainEntity with at least 3 Q&A pairs
- HowTo: name and at least 3 steps
- Organization: name, logo, contactPoint, sameAs, foundingDate, url, description

### 4. llms.txt Generation

Use when the user wants `llms.txt` or `llms-full.txt` created or improved.

If a URL is provided:
1. Run:
   ```
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json --factors ai-readable-content
   ```
2. Analyze existing AI-readable files if present.
3. Extract key content from the site.
4. Generate improved `llms.txt` and `llms-full.txt`.

If no URL is provided:
1. Inspect the current project.
2. Extract business name, services, FAQs, contact info, and metadata.
3. Generate both files from local sources.

After generation:
- Add `<link rel="alternate" type="text/markdown" href="/llms.txt">` if appropriate.
- Suggest adding the files to the sitemap.

### 5. Monitoring and Comparison

Use when the user wants change tracking over time or competitor comparison.

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

## Core Rules

- If the task needs a deployed site and no URL is provided, ask for the URL.
- If the task is diagnosis only, do not edit files.
- If the task is a fix request, make the edits and verify with a rerun when possible.
- If `npx` fails, suggest `npm install -g @ainyc/aeo-audit`.
- If the URL is unreachable or not HTML, report the exact failure.
