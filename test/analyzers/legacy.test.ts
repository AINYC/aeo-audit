import assert from 'node:assert/strict'
import test from 'node:test'
import { load } from 'cheerio'

import { parseJsonLdScripts, getVisibleText, extractSchemaTypes } from '../../src/analyzers/helpers.js'
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

test('extractSchemaTypes finds nested HowTo inside a parent schema', () => {
  const html = `<html><head>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": ["ProfessionalService", "LocalBusiness"],
          "name": "Test Biz",
          "hasProcess": {
            "@type": "HowTo",
            "name": "How It Works",
            "step": [{"@type": "HowToStep", "name": "Step 1"}]
          }
        }
      ]
    }
    </script>
  </head><body></body></html>`
  const $ = load(html)
  const structuredData = parseJsonLdScripts($)
  const types = extractSchemaTypes(structuredData)

  assert.ok(types.has('HowTo'), 'should detect nested HowTo')
  assert.ok(types.has('ProfessionalService'), 'should detect top-level ProfessionalService')
  assert.ok(types.has('LocalBusiness'), 'should detect top-level LocalBusiness')
  assert.ok(types.has('HowToStep'), 'should detect deeply nested HowToStep')
})

test('structured data analyzer detects nested HowTo schema', () => {
  const html = `<html><head>
    <title>Test</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": ["ProfessionalService", "LocalBusiness"],
          "name": "Test Biz",
          "url": "https://example.com",
          "telephone": "+1-555-0100",
          "email": "info@example.com",
          "address": { "@type": "PostalAddress", "streetAddress": "123 Main" },
          "hasProcess": {
            "@type": "HowTo",
            "name": "How It Works",
            "step": [{"@type": "HowToStep", "name": "Step 1"}]
          }
        },
        {
          "@type": "FAQPage",
          "mainEntity": [{"@type": "Question", "name": "Q1", "acceptedAnswer": {"@type": "Answer", "text": "A1"}}]
        },
        {
          "@type": "Service",
          "name": "Consulting"
        }
      ]
    }
    </script>
  </head><body><p>Hello world</p></body></html>`

  const result = analyzeStructuredData(buildContext(html))
  const howToFinding = result.findings.find((f) => f.message.includes('HowTo'))
  assert.ok(howToFinding, 'should have a HowTo finding')
  assert.equal(howToFinding?.type, 'found', 'HowTo should be detected as found, not missing')
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
