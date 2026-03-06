---
name: aeo-audit
description: Run a comprehensive AEO (Answer Engine Optimization) audit on any URL. Scores 13 ranking factors that determine whether AI answer engines (ChatGPT, Perplexity, Gemini, Claude) will cite a website. Use when checking AEO readiness, diagnosing AI visibility, or benchmarking competitors.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
argument-hint: <url>
---

# AEO Audit

Website: [ainyc.ai](https://ainyc.ai)

Run a comprehensive Answer Engine Optimization audit on the provided URL.

## Steps

1. Run the audit:
   ```
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json
   ```
2. Parse the JSON output
3. Present results as a formatted report:
   - **Overall Grade** (letter grade + numeric score out of 100)
   - **Summary** (1-2 sentence overview)
   - **Factor Breakdown** as a table: Factor | Weight | Score | Grade | Status
   - **Top 3 Strengths** with specific evidence from findings
   - **Top 3 Opportunities** with actionable recommendations
   - **Metadata** (fetch time, word count, auxiliary file availability)
4. If the user is working in a codebase, offer to fix specific issues found

## Grading Scale

- A+ (97+): Exceptional AEO readiness — strong across all factors
- A/A- (90-96): Strong foundation with minor gaps
- B range (80-89): Good but clear improvement opportunities
- C range (70-79): Moderate — significant work needed
- D range (60-69): Weak — fundamental signals missing
- F (<60): Critical — requires comprehensive AEO overhaul

## 13 Scoring Factors

Structured Data, Content Depth, AI-Readable Content, E-E-A-T Signals, FAQ Content, Citations & Authority, Schema Completeness, Entity Consistency, Content Freshness, Content Extractability, Definition Blocks, AI Crawler Access, Named Entities.

## Error Handling

- If npx fails, suggest: `npm install -g @ainyc/aeo-audit` then retry
- If the target URL is unreachable, report the specific error
- If the URL returns non-HTML, explain and suggest the correct URL
