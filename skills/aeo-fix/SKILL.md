---
name: aeo-fix
description: Audit a deployed URL for AEO issues, then automatically fix problems in the current codebase. Use when improving AEO score by modifying source code — adds missing schemas, creates llms.txt, updates robots.txt, etc.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
  - Read
  - Edit
  - Write
  - Glob
  - Grep
context: fork
argument-hint: <url>
---

# AEO Fix

Audit a URL and fix AEO issues directly in the current codebase.

## Steps

1. Run: `npx @ainyc/aeo-audit@latest $ARGUMENTS --format json`
2. Parse results and identify factors with status `partial` or `fail` (score < 70)
3. For each failing factor, search the codebase and apply fixes:

   **Structured Data / Schema Completeness issues:**
   - Find layout files with JSON-LD (`Grep` for `application/ld+json`)
   - Add missing schema types (LocalBusiness, FAQPage, HowTo) or missing properties

   **AI-Readable Content issues:**
   - Check for `public/llms.txt` and `public/llms-full.txt`
   - Create them if missing, using page content to generate summaries
   - Add `<link rel="alternate" type="text/markdown" href="/llms.txt">` to HTML head

   **AI Crawler Access issues:**
   - Check `public/robots.txt` — add explicit Allow directives for GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended

   **E-E-A-T issues:**
   - Add `<meta name="author">` tag
   - Add Person schema with credentials if team info exists
   - Add links to /privacy, /terms, /about pages

   **FAQ Content issues:**
   - Add FAQPage schema wrapping existing Q&A content
   - Add `<details>/<summary>` blocks for FAQ sections

   **Content Freshness issues:**
   - Update `dateModified` in structured data to today's date
   - Update sitemap.xml `lastmod` entries

4. Re-run the audit to verify improvements: `npx @ainyc/aeo-audit@latest $ARGUMENTS --format json`
5. Report changes made and new score

## Rules

- Never remove existing content or schema — only add and enhance
- Preserve existing code style and patterns
- If unsure about a fix, explain options and ask the user
