import { describe, it, expect } from 'vitest'
import { load } from 'cheerio'

import { parseJsonLdScripts, getVisibleText } from '../../src/analyzers/helpers.js'
import { analyzeSchemaValidity } from '../../src/analyzers/schema-validity.js'
import { defaultAuxiliary } from '../fixtures/pages.js'
import type { AuditContext } from '../../src/types.js'

function buildContext(html: string): AuditContext {
  const $ = load(html)
  return {
    $,
    html,
    url: 'https://example.com/',
    headers: {},
    auxiliary: defaultAuxiliary,
    structuredData: parseJsonLdScripts($),
    textContent: getVisibleText($, html),
    pageTitle: $('title').first().text().trim(),
  }
}

const wrap = (head: string) => `<!doctype html><html><head><title>T</title>${head}</head><body></body></html>`
const ldBlock = (raw: string) => `<script type="application/ld+json">${raw}</script>`
const ld = (obj: unknown) => ldBlock(JSON.stringify(obj))

// ─── No JSON-LD: nothing to validate ──────────────────────────────────────────
describe('no JSON-LD', () => {
  it('scores 100 with an info finding when the page has no JSON-LD', () => {
    const result = analyzeSchemaValidity(buildContext(wrap('')))
    expect(result.score).toBe(100)
    expect(result.recommendations).toEqual([])
    expect(result.findings.some((f) => f.type === 'info' && /No JSON-LD blocks found/.test(f.message))).toBe(true)
  })
})

// ─── Clean pages score 100 ────────────────────────────────────────────────────
describe('clean JSON-LD', () => {
  it('scores 100 for a single FAQPage block', () => {
    const html = wrap(ld({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [],
    }))
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(100)
    expect(result.findings.some((f) => f.type === 'found' && /valid and unique/.test(f.message))).toBe(true)
  })

  it('scores 100 with a FAQPage and an Organization (different singletons)', () => {
    const html = wrap(`
      ${ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] })}
      ${ld({ '@context': 'https://schema.org', '@type': 'Organization', name: 'Acme' })}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(100)
  })

  it('counts each @graph entry as its own root, no false-positive duplicate', () => {
    const html = wrap(ld({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'FAQPage', mainEntity: [] },
        { '@type': 'Organization', name: 'Acme' },
        { '@type': 'BreadcrumbList', itemListElement: [] },
      ],
    }))
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(100)
  })

  it('handles @type as an array without flagging duplicates', () => {
    const html = wrap(ld({
      '@context': 'https://schema.org',
      '@type': ['LocalBusiness', 'ProfessionalService'],
      name: 'Acme',
    }))
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(100)
  })
})

// ─── Duplicate singleton @type (the azcoatings bug) ───────────────────────────
describe('duplicate singleton @types', () => {
  it('flags duplicate FAQPage and caps score below the pass threshold', () => {
    const html = wrap(`
      ${ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] })}
      ${ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] })}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBeLessThan(70)
    expect(result.findings.some((f) => f.type === 'missing' && /Duplicate singleton @type "FAQPage"/.test(f.message))).toBe(true)
    expect(result.recommendations.some((r) => /Remove duplicate "FAQPage"/.test(r))).toBe(true)
  })

  it('detects duplicates split across separate root blocks and a @graph wrapper', () => {
    const html = wrap(`
      ${ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] })}
      ${ld({
        '@context': 'https://schema.org',
        '@graph': [{ '@type': 'FAQPage', mainEntity: [] }],
      })}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.findings.some((f) => f.type === 'missing' && /FAQPage/.test(f.message))).toBe(true)
  })

  it('treats only the configured singleton list as singletons (Organization can repeat)', () => {
    const html = wrap(`
      ${ld({ '@context': 'https://schema.org', '@type': 'Organization', name: 'A' })}
      ${ld({ '@context': 'https://schema.org', '@type': 'Organization', name: 'B' })}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(100)
  })

  it('does not flag duplicates when only @type-array entries overlap on a non-singleton', () => {
    const html = wrap(`
      ${ld({ '@type': ['LocalBusiness', 'ProfessionalService'], name: 'A' })}
      ${ld({ '@type': ['LocalBusiness', 'ProfessionalService'], name: 'B' })}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(100)
  })
})

// ─── JSON parse errors ────────────────────────────────────────────────────────
describe('JSON parse errors', () => {
  it('flags malformed JSON and caps score below pass threshold', () => {
    const html = wrap(ldBlock('{ this is: not valid json'))
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBeLessThan(70)
    expect(result.findings.some((f) => f.type === 'missing' && /invalid JSON syntax/.test(f.message))).toBe(true)
    expect(result.recommendations.some((r) => /Fix JSON syntax error/.test(r))).toBe(true)
  })

  it('flags multiple parse errors with distinct findings per block', () => {
    const html = wrap(`
      ${ldBlock('{bad}')}
      ${ldBlock('{also bad}')}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    const parseFindings = result.findings.filter((f) => f.type === 'missing' && /invalid JSON syntax/.test(f.message))
    expect(parseFindings).toHaveLength(2)
  })
})

// ─── Empty / whitespace-only blocks ───────────────────────────────────────────
describe('empty blocks', () => {
  it('flags an empty block with a missing-type finding', () => {
    const html = wrap(ldBlock('   '))
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBe(95)
    expect(result.findings.some((f) => f.type === 'missing' && /empty or whitespace-only/.test(f.message))).toBe(true)
  })

  it('does not cap score for empty-only blocks (no structural error)', () => {
    // Empty blocks alone should not push the factor into failing range —
    // they are noise, not invalidating. Capping is reserved for parse/duplicate.
    const html = wrap(ldBlock(''))
    const result = analyzeSchemaValidity(buildContext(html))
    expect(result.score).toBeGreaterThanOrEqual(70)
  })
})

// ─── Visibility: errors must always show up as findings + recommendations ─────
describe('error visibility (irrespective of score)', () => {
  it('emits a recommendation per structural error so they surface in text-mode top recs', () => {
    const html = wrap(`
      ${ld({ '@type': 'FAQPage' })}
      ${ld({ '@type': 'FAQPage' })}
      ${ldBlock('{bad}')}
    `)
    const result = analyzeSchemaValidity(buildContext(html))
    // 1 duplicate group + 1 parse error = at least 2 actionable recommendations
    expect(result.recommendations.length).toBeGreaterThanOrEqual(2)
    expect(result.findings.filter((f) => f.type === 'missing').length).toBeGreaterThanOrEqual(2)
    expect(result.score).toBeLessThan(70)
  })
})
