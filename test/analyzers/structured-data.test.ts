import { describe, it, expect } from 'vitest'
import { load } from 'cheerio'

import { parseJsonLdScripts, getVisibleText } from '../../src/analyzers/helpers.js'
import { analyzeStructuredData } from '../../src/analyzers/structured-data.js'
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

const html = (body: string) => `<!doctype html><html><head><title>T</title>${body}</head><body></body></html>`
const jsonLd = (obj: unknown) => html(`<script type="application/ld+json">${JSON.stringify(obj)}</script>`)

// ─── No JSON-LD ───────────────────────────────────────────────────────────────
describe('no structured data', () => {
  it('scores 0 and flags missing JSON-LD on a bare page', () => {
    const result = analyzeStructuredData(buildContext(html('')))
    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.type === 'missing' && f.message.includes('No JSON-LD'))).toBe(true)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it('treats malformed JSON-LD the same as no JSON-LD', () => {
    const malformed = html('<script type="application/ld+json">{ this is: not, valid json }</script>')
    const result = analyzeStructuredData(buildContext(malformed))
    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.type === 'missing')).toBe(true)
  })

  it('treats an empty JSON-LD script tag the same as no JSON-LD', () => {
    const empty = html('<script type="application/ld+json">   </script>')
    const result = analyzeStructuredData(buildContext(empty))
    expect(result.score).toBe(0)
  })
})

// ─── Base detection (+30) ─────────────────────────────────────────────────────
describe('JSON-LD presence grants the base +30', () => {
  it('a minimal schema scores at least the base bucket', () => {
    // No priority types, no depth → only the +30 base credit.
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'x',
    })))
    expect(result.score).toBe(30)
    expect(result.findings.some((f) => f.type === 'found' && f.message.includes('JSON-LD block'))).toBe(true)
  })

  it('two JSON-LD blocks register as two blocks in findings', () => {
    const twoBlocks = html(`
      <script type="application/ld+json">${JSON.stringify({ '@type': 'WebPage', name: 'a' })}</script>
      <script type="application/ld+json">${JSON.stringify({ '@type': 'Organization', name: 'b' })}</script>
    `)
    const result = analyzeStructuredData(buildContext(twoBlocks))
    expect(result.findings.some((f) => f.message.includes('2 JSON-LD block'))).toBe(true)
  })
})

// ─── Priority type bonuses (+12 each, max +48) ────────────────────────────────
describe('priority-type bonuses', () => {
  it.each([
    ['LocalBusiness'],
    ['FAQPage'],
    ['Service'],
    ['HowTo'],
  ])('credits %s when present as top-level @type', (type) => {
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': type,
      name: 't',
    })))
    expect(result.findings.some((f) => f.type === 'found' && f.message.includes(`${type} schema detected`))).toBe(true)
  })

  it('flags each priority type individually when missing', () => {
    const result = analyzeStructuredData(buildContext(jsonLd({ '@type': 'WebPage', name: 'x' })))
    for (const t of ['LocalBusiness', 'FAQPage', 'Service', 'HowTo']) {
      expect(result.findings.some((f) => f.type === 'missing' && f.message.includes(t))).toBe(true)
    }
  })

  it('detects priority types nested inside @graph', () => {
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'LocalBusiness', name: 'biz' },
        { '@type': 'FAQPage', mainEntity: [] },
      ],
    })))
    expect(result.findings.some((f) => f.message.includes('LocalBusiness schema detected'))).toBe(true)
    expect(result.findings.some((f) => f.message.includes('FAQPage schema detected'))).toBe(true)
  })

  it('detects priority types deeply nested under arbitrary properties', () => {
    // Regression coverage for nested HowTo fix.
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'biz',
      hasProcess: {
        '@type': 'HowTo',
        name: 'steps',
        step: [{ '@type': 'HowToStep', name: 's1' }],
      },
    })))
    expect(result.findings.some((f) => f.message.includes('HowTo schema detected'))).toBe(true)
  })

  it('credits all four priority types when all are present', () => {
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'LocalBusiness', name: 'b' },
        { '@type': 'FAQPage', name: 'f' },
        { '@type': 'Service', name: 's' },
        { '@type': 'HowTo', name: 'h' },
      ],
    })))
    // base 30 + 4*12 priority = 78 minimum (depth bucket depends on avg properties)
    expect(result.score).toBeGreaterThanOrEqual(78)
    for (const t of ['LocalBusiness', 'FAQPage', 'Service', 'HowTo']) {
      expect(result.findings.some((f) => f.message.includes(`${t} schema detected`))).toBe(true)
    }
  })

  it('treats @type as an array and credits each matching priority type', () => {
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': ['LocalBusiness', 'ProfessionalService'],
      name: 'biz',
    })))
    expect(result.findings.some((f) => f.message.includes('LocalBusiness schema detected'))).toBe(true)
  })
})

// ─── Property depth bucket ────────────────────────────────────────────────────
describe('property depth buckets', () => {
  it('flags shallow (<4 avg properties) with info finding and no depth credit', () => {
    // 3 properties including @context/@type → shallow.
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'x',
    })))
    expect(result.findings.some((f) => f.type === 'info' && f.message.includes('shallow'))).toBe(true)
    // Base 30 only, no depth credit.
    expect(result.score).toBe(30)
  })

  it('awards partial depth (+12) for medium detail (4–7 properties)', () => {
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'x',
      description: 'd',
      url: 'https://example.com',
      inLanguage: 'en',
    })))
    expect(result.findings.some((f) => f.type === 'info' && f.message.includes('more detailed'))).toBe(true)
    // Base 30 + depth 12, no priority types.
    expect(result.score).toBe(42)
    expect(result.recommendations.some((r) => r.includes('sameAs'))).toBe(true)
  })

  it('awards full depth (+22) for strong detail (>=8 properties)', () => {
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'x',
      description: 'd',
      url: 'https://example.com',
      inLanguage: 'en',
      author: 'a',
      datePublished: '2026-01-01',
      dateModified: '2026-02-01',
      keywords: 'k',
    })))
    expect(result.findings.some((f) => f.type === 'found' && f.message.includes('strong property depth'))).toBe(true)
    // Base 30 + depth 22, no priority types.
    expect(result.score).toBe(52)
  })
})

// ─── Recommendation composition ───────────────────────────────────────────────
describe('recommendations', () => {
  it('adds the maintenance recommendation when score >=70 and no other recommendations were triggered', () => {
    // Use a top-level array (not @graph) so we don't get the extra 2-key root block
    // pulling the avg-properties ratio down. Each block has ≥8 keys → full depth credit.
    const result = analyzeStructuredData(buildContext(jsonLd([
      {
        '@type': 'LocalBusiness',
        name: 'biz',
        telephone: '+1',
        email: 'a@b.c',
        url: 'https://x',
        description: 'd',
        areaServed: 'NY',
        sameAs: ['https://x'],
      },
      {
        '@type': 'FAQPage',
        name: 'f',
        description: 'd',
        url: 'https://x',
        mainEntity: [],
        inLanguage: 'en',
        datePublished: '2026-01-01',
        keywords: 'k',
      },
      {
        '@type': 'Service',
        name: 's',
        provider: 'p',
        serviceType: 't',
        areaServed: 'NY',
        description: 'd',
        url: 'https://x',
        offers: {},
      },
      {
        '@type': 'HowTo',
        name: 'h',
        description: 'd',
        step: [],
        totalTime: 'PT1H',
        supply: 'x',
        tool: 'y',
        estimatedCost: 'z',
      },
    ])))
    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.recommendations.some((r) => r.includes('Maintain schema parity'))).toBe(true)
  })

  it('does not add the maintenance recommendation when other recommendations already exist', () => {
    // Shallow → triggers depth recommendation, but score <70.
    const result = analyzeStructuredData(buildContext(jsonLd({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'biz',
    })))
    expect(result.recommendations.some((r) => r.includes('Maintain'))).toBe(false)
  })
})
