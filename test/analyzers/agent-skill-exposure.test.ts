import assert from 'node:assert/strict'
import test from 'node:test'
import { load } from 'cheerio'

import { parseJsonLdScripts, getVisibleText } from '../../src/analyzers/helpers.js'
import { analyzeAgentSkillExposure } from '../../src/analyzers/agent-skill-exposure.js'
import { defaultAuxiliary } from '../fixtures/pages.js'
import type { AuditContext } from '../../src/types.js'

function buildContext(html: string, headers: Record<string, string> = {}): AuditContext {
  const $ = load(html)
  return {
    $,
    html,
    url: 'https://example.com/',
    headers,
    auxiliary: defaultAuxiliary,
    structuredData: parseJsonLdScripts($),
    textContent: getVisibleText($, html),
    pageTitle: $('title').first().text().trim(),
  }
}

test('agent-skill-exposure rewards well-formed SearchAction with target and query-input', () => {
  const html = `<!doctype html><html><head>
    <title>Shop</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "potentialAction": {
        "@type": "SearchAction",
        "target": { "urlTemplate": "https://example.com/search?q={query}" },
        "query-input": "required name=query"
      }
    }
    </script>
  </head><body></body></html>`

  const result = analyzeAgentSkillExposure(buildContext(html))
  assert.ok(result.score >= 35, `expected >=35, got ${result.score}`)
  assert.ok(result.findings.some((f) => f.type === 'found' && f.message.includes('Action')))
})

test('agent-skill-exposure flags Action schema missing target or inputs as partial', () => {
  const html = `<!doctype html><html><head>
    <script type="application/ld+json">
    { "@context": "https://schema.org", "@type": "SearchAction" }
    </script>
  </head><body></body></html>`

  const result = analyzeAgentSkillExposure(buildContext(html))
  assert.ok(result.findings.some((f) => f.type === 'info' && f.message.includes('missing target')))
  assert.ok(result.recommendations.some((r) => r.includes('target')))
})

test('agent-skill-exposure detects MCP discovery link and link header', () => {
  const htmlWithLink = `<!doctype html><html><head>
    <link rel="mcp" href="/.well-known/mcp.json">
  </head><body></body></html>`
  const linkResult = analyzeAgentSkillExposure(buildContext(htmlWithLink))
  assert.ok(linkResult.findings.some((f) => f.type === 'found' && f.message.includes('Agent protocol discovery')))

  const htmlPlain = `<!doctype html><html><head></head><body></body></html>`
  const headerResult = analyzeAgentSkillExposure(
    buildContext(htmlPlain, { link: '</.well-known/mcp.json>; rel="mcp"' }),
  )
  assert.ok(headerResult.findings.some((f) => f.type === 'found' && f.message.includes('Link header')))
})

test('agent-skill-exposure credits a fully agent-usable form', () => {
  const html = `<!doctype html><html><body>
    <form aria-label="Sign up">
      <label for="email">Email</label>
      <input id="email" type="email" name="email" autocomplete="email" required>
      <label for="phone">Phone</label>
      <input id="phone" type="tel" name="phone" autocomplete="tel">
      <label for="zip">ZIP</label>
      <input id="zip" type="text" name="postal-code" autocomplete="postal-code">
      <button type="submit">Sign up</button>
    </form>
  </body></html>`

  const result = analyzeAgentSkillExposure(buildContext(html))
  assert.ok(
    result.findings.some((f) => f.type === 'found' && f.message.includes('strong agent-usable structure')),
    `expected strong-form finding, got: ${JSON.stringify(result.findings)}`,
  )
})

test('agent-skill-exposure penalizes unlabeled form with no autocomplete', () => {
  const html = `<!doctype html><html><body>
    <form>
      <input type="text" name="field_1">
      <input type="text" name="field_2">
      <input type="text" name="field_3">
      <button>Go</button>
    </form>
  </body></html>`

  const result = analyzeAgentSkillExposure(buildContext(html))
  assert.ok(
    result.findings.some((f) => f.type === 'missing' && f.message.includes('weak structure')),
    `expected weak-form finding, got: ${JSON.stringify(result.findings)}`,
  )
  assert.ok(result.recommendations.some((r) => r.includes('autocomplete')))
})

test('agent-skill-exposure scores zero on a bare page with no affordances', () => {
  const html = '<!doctype html><html><head><title>Bare</title></head><body><p>Hello</p></body></html>'
  const result = analyzeAgentSkillExposure(buildContext(html))
  assert.equal(result.score, 0)
  assert.ok(result.findings.some((f) => f.type === 'missing' && f.message.includes('Action')))
  assert.ok(result.findings.some((f) => f.type === 'info' && f.message.includes('No interactive forms')))
})
