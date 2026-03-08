import assert from 'node:assert/strict'
import test from 'node:test'
import { load } from 'cheerio'

import { parseJsonLdScripts, getVisibleText } from '../../src/analyzers/helpers.js'
import { analyzeStructuredData } from '../../src/analyzers/structured-data.js'
import { analyzeAiReadableContent } from '../../src/analyzers/ai-readable-content.js'
import { analyzeContentDepth } from '../../src/analyzers/content-depth.js'
import { analyzeContentFreshness } from '../../src/analyzers/content-freshness.js'
import { scoreFactors } from '../../src/scoring.js'
import { strongHtml, weakHtml, defaultAuxiliary } from '../fixtures/pages.js'
import type { AuditContext, AuxiliaryResources } from '../../src/types.js'

function buildContext(html: string, auxiliary: AuxiliaryResources = defaultAuxiliary): AuditContext {
  const $ = load(html)
  const structuredData = parseJsonLdScripts($)
  return {
    $,
    html,
    url: 'https://ainyc.ai/',
    headers: {
      'last-modified': 'Wed, 21 Feb 2026 10:00:00 GMT',
    },
    auxiliary,
    structuredData,
    textContent: getVisibleText($, html),
    pageTitle: $('title').first().text().trim(),
  }
}

test('structured data analyzer scores strong fixture highly', () => {
  const result = analyzeStructuredData(buildContext(strongHtml))
  assert.ok(result.score >= 75)
  assert.ok(result.findings.some((finding) => finding.type === 'found'))
})

test('ai-readable analyzer handles timeout as uncertain instead of hard-missing', () => {
  const context = buildContext(strongHtml, {
    ...defaultAuxiliary,
    llmsFullTxt: {
      state: 'timeout',
      body: '',
    },
  })

  const result = analyzeAiReadableContent(context)
  assert.ok(result.score > 0)
  assert.ok(result.findings.some((finding) => finding.type === 'timeout'))
})

test('content depth analyzer penalizes thin pages', () => {
  const result = analyzeContentDepth(buildContext(weakHtml))
  assert.ok(result.score < 50)
  assert.ok(result.findings.some((finding) => finding.type === 'missing'))
})

test('freshness analyzer reports sitemap timeout as timeout finding', () => {
  const context = buildContext(strongHtml, {
    ...defaultAuxiliary,
    sitemapXml: {
      state: 'timeout',
      body: '',
    },
  })

  const result = analyzeContentFreshness(context)
  assert.ok(result.findings.some((finding) => finding.type === 'timeout'))
})

test('scoring engine computes grades and statuses', () => {
  const scored = scoreFactors([
    {
      id: 'structured-data',
      name: 'Structured Data (JSON-LD)',
      weight: 15,
      score: 80,
      findings: [],
      recommendations: [],
    },
    {
      id: 'ai-readable-content',
      name: 'AI-Readable Content',
      weight: 12,
      score: 20,
      findings: [],
      recommendations: [],
    },
  ])

  assert.equal(scored.factors[0].status, 'pass')
  assert.equal(scored.factors[1].status, 'fail')
  assert.ok(typeof scored.overallGrade === 'string')
})
