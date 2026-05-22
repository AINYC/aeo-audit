import { describe, it, expect, afterEach, vi } from 'vitest'
import { load } from 'cheerio'

import { analyzeLighthouse } from '../../src/analyzers/lighthouse.js'
import type { AuditContext } from '../../src/types.js'

function buildContext(url = 'https://example.com/'): AuditContext {
  const $ = load('<html></html>')
  return {
    $,
    html: '',
    url,
    headers: {},
    auxiliary: {},
    structuredData: [],
    textContent: '',
    pageTitle: '',
  }
}

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('analyzeLighthouse', () => {
  const realFetch = globalThis.fetch
  const realApiKey = process.env.PAGESPEED_API_KEY

  afterEach(() => {
    globalThis.fetch = realFetch
    if (realApiKey === undefined) {
      delete process.env.PAGESPEED_API_KEY
    } else {
      process.env.PAGESPEED_API_KEY = realApiKey
    }
  })

  it('averages category scores into a 0–100 result', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeJsonResponse({
      lighthouseResult: {
        categories: {
          performance: { id: 'performance', title: 'Performance', score: 0.8 },
          accessibility: { id: 'accessibility', title: 'Accessibility', score: 0.9 },
          'best-practices': { id: 'best-practices', title: 'Best Practices', score: 1.0 },
        },
        audits: {},
      },
    }))

    const result = await analyzeLighthouse(buildContext())

    expect(result.score).toBe(90)
    expect(result.findings).toHaveLength(3)
    expect(result.findings.some((f) => f.type === 'found' && f.message === 'Best Practices: 100/100')).toBe(true)
    expect(result.findings.some((f) => f.type === 'info' && f.message === 'Performance: 80/100')).toBe(true)
    expect(result.recommendations).toHaveLength(0)
  })

  it('surfaces the 5 lowest-scoring audits as recommendations', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeJsonResponse({
      lighthouseResult: {
        categories: { performance: { score: 0.5 } },
        audits: {
          a1: { title: 'Audit One', score: 0.1, scoreDisplayMode: 'numeric' },
          a2: { title: 'Audit Two', score: 0.5, scoreDisplayMode: 'numeric' },
          a3: { title: 'Audit Three (binary)', score: 0.0, scoreDisplayMode: 'binary' },
          a4: { title: 'Audit Four', score: 0.3, scoreDisplayMode: 'numeric' },
          a5: { title: 'Audit Five', score: 0.7, scoreDisplayMode: 'numeric' },
          a6: { title: 'Audit Six', score: 0.85, scoreDisplayMode: 'numeric' },
          a7: { title: 'Audit Passing', score: 0.95, scoreDisplayMode: 'numeric' },
          a8: { title: 'Audit Manual', score: null, scoreDisplayMode: 'manual' },
        },
      },
    }))

    const result = await analyzeLighthouse(buildContext())

    expect(result.recommendations).toHaveLength(5)
    // Sorted by lowest score: a3(0), a1(0.1), a4(0.3), a2(0.5), a5(0.7) → a6 spills off, a7/a8 filtered out
    expect(result.recommendations[0]).toContain('Audit Three (binary)')
    expect(result.recommendations[1]).toContain('Audit One')
    expect(result.recommendations[4]).toContain('Audit Five')
    expect(result.recommendations.some((r) => r.includes('Audit Six'))).toBe(false)
    expect(result.recommendations.some((r) => r.includes('Audit Passing'))).toBe(false)
    expect(result.recommendations.some((r) => r.includes('Audit Manual'))).toBe(false)
  })

  it('appends PAGESPEED_API_KEY when set, omits it otherwise', async () => {
    process.env.PAGESPEED_API_KEY = 'test-key-123'

    const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse({
      lighthouseResult: { categories: { performance: { score: 0.5 } }, audits: {} },
    }))
    globalThis.fetch = fetchMock

    await analyzeLighthouse(buildContext())
    expect(fetchMock.mock.calls[0][0]).toContain('key=test-key-123')

    delete process.env.PAGESPEED_API_KEY
    fetchMock.mockClear()
    await analyzeLighthouse(buildContext())
    expect(fetchMock.mock.calls[0][0]).not.toContain('key=')
  })

  it('returns score 0 with unreachable finding on PSI HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeJsonResponse(
      { error: { message: 'Invalid URL' } },
      400,
    ))

    const result = await analyzeLighthouse(buildContext())

    expect(result.score).toBe(0)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].type).toBe('unreachable')
    expect(result.findings[0].message).toContain('HTTP 400')
    expect(result.findings[0].message).toContain('Invalid URL')
    expect(result.recommendations).toHaveLength(1)
  })

  it('returns score 0 with timeout finding when the request aborts', async () => {
    globalThis.fetch = vi.fn().mockImplementation(() => {
      const error = new Error('aborted')
      error.name = 'AbortError'
      return Promise.reject(error)
    })

    const result = await analyzeLighthouse(buildContext())

    expect(result.score).toBe(0)
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].type).toBe('timeout')
    expect(result.findings[0].message).toContain('timed out')
  })

  it('returns score 0 when PSI omits every category score', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(makeJsonResponse({
      lighthouseResult: { categories: {}, audits: {} },
    }))

    const result = await analyzeLighthouse(buildContext())

    expect(result.score).toBe(0)
    expect(result.findings.some((f) => f.type === 'unreachable')).toBe(true)
  })

  it('uses mobile strategy and requests three categories', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeJsonResponse({
      lighthouseResult: { categories: { performance: { score: 1 } }, audits: {} },
    }))
    globalThis.fetch = fetchMock

    await analyzeLighthouse(buildContext('https://example.com/page'))

    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toContain('strategy=mobile')
    expect(url).toContain('category=performance')
    expect(url).toContain('category=accessibility')
    expect(url).toContain('category=best-practices')
    expect(url).toContain(encodeURIComponent('https://example.com/page'))
  })
})
