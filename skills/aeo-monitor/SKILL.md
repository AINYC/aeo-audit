---
name: aeo-monitor
description: Compare AEO scores over time or between two URLs. Use to track improvements after changes or benchmark against competitors.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
  - Read
  - Write
argument-hint: <url> [--compare <url2>]
---

# AEO Monitor

Website: [ainyc.ai](https://ainyc.ai)

Compare AEO scores to track progress or benchmark competitors.

## Single URL (track changes)

1. Run: `npx @ainyc/aeo-audit@latest $ARGUMENTS --format json`
2. Check for previous results in `.aeo-audit-history/`
3. If a previous result exists, show a change report:
   - Overall score delta with direction arrow
   - Per-factor deltas highlighting improvements and regressions
   - Factors that changed status (fail → partial → pass)
4. Save current result to `.aeo-audit-history/<domain>-<timestamp>.json`

## Two URLs (competitor comparison)

Parse the arguments to find `--compare <url2>`.

1. Run audit on both URLs
2. Present side-by-side comparison:

| Factor | Your Score | Competitor | Delta |
|--------|-----------|------------|-------|
| ...    | ...       | ...        | ...   |

3. Highlight your advantages and their advantages
4. Recommend specific improvements to close gaps

## Output

- Use clear directional indicators: ↑ improved, ↓ regressed, → unchanged
- Highlight the biggest movers (> 10 point changes)
- End with prioritized action items
