---
name: aeo-llms-generate
description: Generate optimized llms.txt and llms-full.txt files for AI readability. Works with a URL (analyzes existing content) or the current project (scans source code). Use when creating or improving AI-readable content files.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
  - Bash(curl *)
  - Read
  - Write
  - Glob
  - Grep
argument-hint: "[url-or-blank-for-current-project]"
---

# AEO llms.txt Generator

Generate optimized llms.txt and llms-full.txt files.

## If URL provided

1. Run: `npx @ainyc/aeo-audit@latest $ARGUMENTS --format json --factors ai-readable-content`
2. Analyze existing llms.txt / llms-full.txt if present
3. Fetch the page content and extract key information
4. Generate improved versions

## If no URL (current project)

1. Search the codebase for content sources:
   - Page files (layout, page components)
   - Metadata and structured data (JSON-LD)
   - README, package.json
2. Extract: business name, services, team info, contact details, FAQs, location
3. Generate both files

## llms.txt Format (concise, ~200 words)

```markdown
# [Business Name]

> [1-2 sentence summary with key value proposition]

## About

- [Link to about page with description]

## Services

- [Service 1 with link]
- [Service 2 with link]

## How It Works

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Contact

- Email: [email]
- Location: [city/region]
```

## llms-full.txt Format (comprehensive, ~800+ words)

Expand every section from llms.txt with full detail:
- Complete service descriptions
- FAQ section with Q&A pairs
- Team bios and expertise
- Industry context
- Detailed service area coverage

## After Generation

- Add `<link rel="alternate" type="text/markdown" href="/llms.txt">` to the HTML head if not present
- Suggest adding both files to the sitemap
