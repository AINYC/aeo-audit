import { describe, expect, it } from 'vitest'

import { detectPlatformFromInput } from '../src/detect-platform.js'

const wrap = (head: string = '', body: string = '', htmlAttrs: string = '') =>
  `<!doctype html><html${htmlAttrs ? ' ' + htmlAttrs : ''}><head>${head}</head><body>${body}</body></html>`

describe('detectPlatformFromInput', () => {
  describe('CMS detection', () => {
    it('detects WordPress from generator + wp-content paths', () => {
      const html = wrap(
        '<meta name="generator" content="WordPress 6.4.1">' +
          '<link rel="stylesheet" href="/wp-content/themes/twentytwenty/style.css">' +
          '<script src="/wp-includes/js/jquery/jquery.js"></script>',
      )
      const result = detectPlatformFromInput({ html })
      const wp = result.detected.find((p) => p.id === 'wordpress')
      expect(wp, 'expected WordPress detection').toBeDefined()
      expect(wp!.confidence).toBe('high')
      expect(wp!.version).toBe('6.4.1')
      expect(wp!.evidence.length).toBeGreaterThanOrEqual(2)
    })

    it('detects Drupal from x-generator header', () => {
      const result = detectPlatformFromInput({
        html: wrap(),
        headers: { 'x-generator': 'Drupal 10 (https://www.drupal.org)' },
      })
      const drupal = result.detected.find((p) => p.id === 'drupal')
      expect(drupal).toBeDefined()
      expect(drupal!.confidence).toBe('high')
    })

    it('detects Ghost from generator', () => {
      const html = wrap('<meta name="generator" content="Ghost 5.78">')
      const result = detectPlatformFromInput({ html })
      const ghost = result.detected.find((p) => p.id === 'ghost')
      expect(ghost).toBeDefined()
      expect(ghost!.version).toBe('5.78')
    })

    it('detects HubSpot CMS at high confidence when meta generator declares it', () => {
      const html = wrap('<meta name="generator" content="HubSpot">')
      const result = detectPlatformFromInput({ html })
      const hs = result.detected.find((p) => p.id === 'hubspot')
      expect(hs).toBeDefined()
      expect(hs!.confidence).toBe('high')
    })

    it('does not flag HubSpot CMS at high confidence from a tracking pixel alone', () => {
      // js.hs-scripts.com is the HubSpot CRM tracking pixel — countless non-CMS sites embed it.
      const html = wrap('<script src="//js.hs-scripts.com/12345.js"></script>')
      const result = detectPlatformFromInput({ html })
      const hs = result.detected.find((p) => p.id === 'hubspot')
      expect(hs).toBeDefined()
      expect(hs!.confidence).not.toBe('high')
    })
  })

  describe('Site builder detection', () => {
    it('detects Wix from generator + static.wixstatic.com', () => {
      const html = wrap(
        '<meta name="generator" content="Wix.com Website Builder">' +
          '<script src="https://static.wixstatic.com/services/main.js"></script>',
      )
      const result = detectPlatformFromInput({ html })
      const wix = result.detected.find((p) => p.id === 'wix')
      expect(wix).toBeDefined()
      expect(wix!.confidence).toBe('high')
    })

    it('detects Squarespace from Static.SQUARESPACE_CONTEXT global', () => {
      const html = wrap('', '<script>Static.SQUARESPACE_CONTEXT = {};</script>')
      const result = detectPlatformFromInput({ html })
      const sq = result.detected.find((p) => p.id === 'squarespace')
      expect(sq).toBeDefined()
      expect(sq!.confidence).toBe('high')
    })

    it('detects Webflow from data-wf-page attribute on <html>', () => {
      const html = wrap('', '', 'data-wf-page="abc123" data-wf-site="xyz"')
      const result = detectPlatformFromInput({ html })
      const wf = result.detected.find((p) => p.id === 'webflow')
      expect(wf).toBeDefined()
      expect(wf!.confidence).toBe('high')
    })

    it('detects Framer from generator + framerusercontent', () => {
      const html = wrap(
        '<meta name="generator" content="Framer">' +
          '<link rel="preload" href="https://framerusercontent.com/assets/x.png">',
      )
      const result = detectPlatformFromInput({ html })
      const framer = result.detected.find((p) => p.id === 'framer')
      expect(framer).toBeDefined()
    })
  })

  describe('E-commerce detection', () => {
    it('detects Shopify from headers + theme global', () => {
      const html = wrap('', '<script>var Shopify = Shopify || {}; Shopify.theme = {};</script>')
      const result = detectPlatformFromInput({
        html,
        headers: { 'x-shopid': '12345' },
      })
      const shop = result.detected.find((p) => p.id === 'shopify')
      expect(shop).toBeDefined()
      expect(shop!.confidence).toBe('high')
    })

    it('detects WooCommerce as a layered signal on top of WordPress', () => {
      const html = wrap(
        '<meta name="generator" content="WordPress 6.4">',
        '',
        '',
      ).replace(
        '<body>',
        '<body class="woocommerce-page woocommerce">',
      )
      const result = detectPlatformFromInput({ html })
      expect(result.detected.find((p) => p.id === 'wordpress')).toBeDefined()
      expect(result.detected.find((p) => p.id === 'woocommerce')).toBeDefined()
    })

    it('detects BigCommerce from cdn11.bigcommerce.com', () => {
      const html = wrap('<script src="https://cdn11.bigcommerce.com/r-1234/javascript/jquery.js"></script>')
      const result = detectPlatformFromInput({ html })
      expect(result.detected.find((p) => p.id === 'bigcommerce')).toBeDefined()
    })
  })

  describe('JS framework detection', () => {
    it('detects Next.js from __NEXT_DATA__ script', () => {
      const html = wrap(
        '',
        '<script id="__NEXT_DATA__" type="application/json">{}</script><script src="/_next/static/chunks/main.js"></script>',
      )
      const result = detectPlatformFromInput({ html })
      const next = result.detected.find((p) => p.id === 'nextjs')
      expect(next).toBeDefined()
      expect(next!.confidence).toBe('high')
    })

    it('detects Nuxt from window.__NUXT__ + /_nuxt/', () => {
      const html = wrap(
        '',
        '<script>window.__NUXT__ = {};</script><script src="/_nuxt/entry.js"></script>',
      )
      const result = detectPlatformFromInput({ html })
      expect(result.detected.find((p) => p.id === 'nuxt')).toBeDefined()
    })

    it('detects Gatsby from div#___gatsby', () => {
      const html = wrap('', '<div id="___gatsby"></div>')
      const result = detectPlatformFromInput({ html })
      expect(result.detected.find((p) => p.id === 'gatsby')).toBeDefined()
    })

    it('detects Astro from generator + data-astro-cid attribute', () => {
      const html = wrap('<meta name="generator" content="Astro v4.5.2">', '<div data-astro-cid-abc123>x</div>')
      const result = detectPlatformFromInput({ html })
      const astro = result.detected.find((p) => p.id === 'astro')
      expect(astro).toBeDefined()
      expect(astro!.version).toBe('4.5.2')
    })

    it('detects Angular from ng-version attribute and captures the version', () => {
      const html = wrap('', '<app-root ng-version="17.1.2"></app-root>')
      const result = detectPlatformFromInput({ html })
      const ng = result.detected.find((p) => p.id === 'angular')
      expect(ng).toBeDefined()
      expect(ng!.confidence).toBe('high')
      expect(ng!.version).toBe('17.1.2')
    })

    it('detects Remix from window.__remixContext', () => {
      const html = wrap('', '<script>window.__remixContext = {};</script>')
      const result = detectPlatformFromInput({ html })
      expect(result.detected.find((p) => p.id === 'remix')).toBeDefined()
    })
  })

  describe('Static site generator detection', () => {
    it('detects Hugo from generator', () => {
      const html = wrap('<meta name="generator" content="Hugo 0.121.1">')
      const result = detectPlatformFromInput({ html })
      const hugo = result.detected.find((p) => p.id === 'hugo')
      expect(hugo).toBeDefined()
      expect(hugo!.version).toBe('0.121.1')
    })

    it('detects Jekyll from generator', () => {
      const html = wrap('<meta name="generator" content="Jekyll v4.3.2">')
      const result = detectPlatformFromInput({ html })
      const j = result.detected.find((p) => p.id === 'jekyll')
      expect(j).toBeDefined()
      expect(j!.version).toBe('4.3.2')
    })

    it('detects Docusaurus from __docusaurus marker', () => {
      const html = wrap('<meta name="generator" content="Docusaurus v3.0.0">')
      const result = detectPlatformFromInput({ html })
      expect(result.detected.find((p) => p.id === 'docusaurus')).toBeDefined()
    })
  })

  describe('Hosting detection', () => {
    it('detects Vercel from x-vercel-id header', () => {
      const result = detectPlatformFromInput({
        html: wrap(),
        headers: { 'x-vercel-id': 'sfo1::abc123', server: 'Vercel' },
      })
      const v = result.detected.find((p) => p.id === 'vercel')
      expect(v).toBeDefined()
      expect(v!.confidence).toBe('high')
    })

    it('detects Netlify from x-nf-request-id header', () => {
      const result = detectPlatformFromInput({
        html: wrap(),
        headers: { 'x-nf-request-id': 'abc-123', server: 'Netlify' },
      })
      expect(result.detected.find((p) => p.id === 'netlify')).toBeDefined()
    })

    it('detects Cloudflare from cf-ray header', () => {
      const result = detectPlatformFromInput({
        html: wrap(),
        headers: { server: 'cloudflare', 'cf-ray': '8a1b2c3d-LAX' },
      })
      expect(result.detected.find((p) => p.id === 'cloudflare')).toBeDefined()
    })

    it('detects GitHub Pages from server header', () => {
      const result = detectPlatformFromInput({
        html: wrap(),
        headers: { server: 'GitHub.com', 'x-github-request-id': 'abc' },
      })
      expect(result.detected.find((p) => p.id === 'github-pages')).toBeDefined()
    })
  })

  describe('Custom site behavior', () => {
    it('flags isCustom=true when only framework + hosting are detected', () => {
      const html = wrap(
        '',
        '<script id="__NEXT_DATA__">{}</script><script src="/_next/static/x.js"></script>',
      )
      const result = detectPlatformFromInput({
        html,
        headers: { 'x-vercel-id': 'sfo1::abc' },
      })
      expect(result.isCustom).toBe(true)
      expect(result.detected.find((p) => p.id === 'nextjs')).toBeDefined()
      expect(result.detected.find((p) => p.id === 'vercel')).toBeDefined()
    })

    it('flags isCustom=false when a CMS is detected', () => {
      const html = wrap(
        '<meta name="generator" content="WordPress 6.4">' +
          '<link rel="stylesheet" href="/wp-content/themes/x.css">',
      )
      const result = detectPlatformFromInput({ html })
      expect(result.isCustom).toBe(false)
    })

    it('returns no detections and isCustom=true for a fully blank page', () => {
      const result = detectPlatformFromInput({
        html: '<!doctype html><html><head><title>x</title></head><body>hi</body></html>',
      })
      expect(result.detected).toHaveLength(0)
      expect(result.isCustom).toBe(true)
      expect(result.rawSignals.generator).toBeNull()
    })

    it('captures raw signals even when no platform matches', () => {
      const html = wrap('<meta name="generator" content="MysteryStack 1.0">')
      const result = detectPlatformFromInput({
        html,
        headers: { 'x-powered-by': 'PHP/8.2', server: 'nginx' },
      })
      expect(result.rawSignals.generator).toBe('MysteryStack 1.0')
      expect(result.rawSignals.xPoweredBy).toBe('PHP/8.2')
      expect(result.rawSignals.server).toBe('nginx')
    })
  })

  describe('Confidence + ranking', () => {
    it('sorts detections by confidence score (highest first)', () => {
      const html = wrap(
        '<meta name="generator" content="WordPress 6.4">' +
          '<link rel="stylesheet" href="/wp-content/x.css">',
        '<div data-reactroot></div>',
      )
      const result = detectPlatformFromInput({ html })
      const wpIdx = result.detected.findIndex((p) => p.id === 'wordpress')
      const reactIdx = result.detected.findIndex((p) => p.id === 'react')
      expect(wpIdx).toBeGreaterThanOrEqual(0)
      // WordPress should rank above generic React if both detected.
      if (reactIdx >= 0) expect(wpIdx).toBeLessThan(reactIdx)
    })

    it('respects minConfidence=high — drops weaker matches', () => {
      const html = wrap('', '<div data-reactroot></div>') // weak React signal only
      const all = detectPlatformFromInput({ html })
      const high = detectPlatformFromInput({ html }, { minConfidence: 'high' })
      // React alone would be at most ~medium; high filter should drop it.
      expect(high.detected.length).toBeLessThanOrEqual(all.detected.length)
      expect(high.detected.find((p) => p.id === 'react')).toBeUndefined()
    })
  })
})
