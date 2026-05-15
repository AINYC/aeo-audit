import { describe, it, expect } from 'vitest'
import { load } from 'cheerio'

import { analyzeSnippetEligibility } from '../../src/analyzers/snippet-eligibility.js'
import { getVisibleText, parseJsonLdScripts } from '../../src/analyzers/helpers.js'
import type { AuditContext, AuxiliaryResources } from '../../src/types.js'

function aux(): AuxiliaryResources {
  return {
    llmsTxt: { state: 'missing', body: '' },
    llmsFullTxt: { state: 'missing', body: '' },
    robotsTxt: { state: 'missing', body: '' },
    sitemapXml: { state: 'missing', body: '' },
  }
}

function buildContext(html: string, headers: Record<string, string> = {}): AuditContext {
  const $ = load(html)
  return {
    $,
    html,
    url: 'https://example.com/',
    headers,
    auxiliary: aux(),
    structuredData: parseJsonLdScripts($),
    textContent: getVisibleText($, html),
    pageTitle: $('title').first().text().trim(),
  }
}

function pageWithRobotsMeta(content: string): string {
  return `<!doctype html><html><head><title>T</title><meta name="robots" content="${content}"></head><body><h1>Topic</h1></body></html>`
}

describe('snippet-eligibility', () => {
  it('awards full score when no robots directives are present', () => {
    const html = '<!doctype html><html><head><title>T</title></head><body><h1>Topic</h1></body></html>'
    const result = analyzeSnippetEligibility(buildContext(html))

    expect(result.score).toBe(100)
    expect(result.findings.some((f) => f.type === 'found' && f.message.includes('eligible'))).toBe(true)
    expect(result.recommendations).toHaveLength(0)
  })

  it('zeroes the score and flags noindex', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('noindex')))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.type === 'missing' && f.message.toLowerCase().includes('noindex'))).toBe(true)
    expect(result.recommendations.some((r) => r.toLowerCase().includes('noindex'))).toBe(true)
  })

  it('zeroes the score for "none" and treats it as noindex', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('none')))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.message.includes('"none"'))).toBe(true)
  })

  it('zeroes the score and quotes Google for nosnippet', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('nosnippet')))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.message.toLowerCase().includes('nosnippet'))).toBe(true)
    expect(result.findings.some((f) => f.message.includes('Google'))).toBe(true)
  })

  it('zeroes the score for max-snippet:0', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('max-snippet:0')))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.message.includes('max-snippet:0'))).toBe(true)
  })

  it('partially penalizes a very small max-snippet cap', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('max-snippet:20')))

    expect(result.score).toBeLessThanOrEqual(60)
    expect(result.score).toBeGreaterThan(0)
    expect(result.findings.some((f) => f.message.includes('max-snippet:20'))).toBe(true)
  })

  it('keeps full score when max-snippet is -1 (unlimited)', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('max-snippet:-1')))

    expect(result.score).toBe(100)
  })

  it('treats noarchive as informational with no penalty', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('noarchive')))

    expect(result.score).toBe(100)
    expect(result.findings.some((f) => f.type === 'info' && f.message.includes('noarchive'))).toBe(true)
  })

  it('honours an X-Robots-Tag header alone', () => {
    const html = '<!doctype html><html><head><title>T</title></head><body><h1>Topic</h1></body></html>'
    const result = analyzeSnippetEligibility(buildContext(html, { 'x-robots-tag': 'noindex' }))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.type === 'missing' && f.message.toLowerCase().includes('noindex'))).toBe(true)
  })

  it('respects a googlebot-prefixed X-Robots-Tag value', () => {
    const html = '<!doctype html><html><head><title>T</title></head><body><h1>Topic</h1></body></html>'
    const result = analyzeSnippetEligibility(buildContext(html, { 'x-robots-tag': 'googlebot: nosnippet' }))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.message.toLowerCase().includes('nosnippet'))).toBe(true)
  })

  it('ignores an X-Robots-Tag value targeted at a non-Google bot', () => {
    const html = '<!doctype html><html><head><title>T</title></head><body><h1>Topic</h1></body></html>'
    const result = analyzeSnippetEligibility(buildContext(html, { 'x-robots-tag': 'bingbot: noindex' }))

    expect(result.score).toBe(100)
  })

  it('merges meta robots and googlebot tags so the most restrictive wins', () => {
    const html = `<!doctype html><html><head>
      <title>T</title>
      <meta name="robots" content="index, follow">
      <meta name="googlebot" content="noindex">
    </head><body><h1>Topic</h1></body></html>`
    const result = analyzeSnippetEligibility(buildContext(html))

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.message.toLowerCase().includes('noindex'))).toBe(true)
  })

  it('parses directives case-insensitively', () => {
    const result = analyzeSnippetEligibility(buildContext(pageWithRobotsMeta('NoIndex, NOSNIPPET')))

    expect(result.score).toBe(0)
    const messages = result.findings.map((f) => f.message.toLowerCase()).join(' ')
    expect(messages).toContain('noindex')
    expect(messages).toContain('nosnippet')
  })
})
