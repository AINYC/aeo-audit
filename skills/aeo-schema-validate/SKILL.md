---
name: aeo-schema-validate
description: Validate JSON-LD structured data on a URL against AEO best practices. Checks schema types, property completeness, and entity consistency. Use for focused schema auditing.
allowed-tools:
  - Bash(npx *)
  - Bash(aeo-audit *)
argument-hint: <url>
---

# AEO Schema Validation

Website: [ainyc.ai](https://ainyc.ai)

Focused validation of JSON-LD structured data for AEO readiness.

## Steps

1. Run a targeted audit:
   ```
   npx @ainyc/aeo-audit@latest $ARGUMENTS --format json --factors structured-data,schema-completeness,entity-consistency
   ```
2. Parse the three factor results
3. Present a detailed schema report:
   - **Schema types found** (list each @type with property count)
   - **Property completeness** per schema type (% of recommended properties present)
   - **Missing recommended properties** for each type
   - **Entity consistency** (name alignment across schema, title, og:title)
4. Provide corrected/enhanced JSON-LD examples for any issues found
5. Show the optimal JSON-LD template for the detected business type

## Schema Type Checklists

**LocalBusiness:** name, address, telephone, openingHours, priceRange, image, url, geo, areaServed, sameAs
**FAQPage:** mainEntity with >= 3 Q&A pairs, each answer >= 15 words
**HowTo:** name, step (>= 3 steps), each step with name and text
**Organization:** name, logo, contactPoint, sameAs, foundingDate, url, description
