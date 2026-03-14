import assert from 'node:assert/strict'
import test from 'node:test'

import { parseSitemapXml, shouldSkipUrl } from '../src/sitemap.js'

test('parseSitemapXml extracts loc and priority from url blocks', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/blog</loc>
  </url>
</urlset>`

  const entries = parseSitemapXml(xml)
  assert.equal(entries.length, 3)
  assert.equal(entries[0].loc, 'https://example.com/')
  assert.equal(entries[0].priority, 1.0)
  assert.equal(entries[1].loc, 'https://example.com/about')
  assert.equal(entries[1].priority, 0.8)
  assert.equal(entries[2].loc, 'https://example.com/blog')
  assert.equal(entries[2].priority, undefined)
})

test('parseSitemapXml handles sitemap index files', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
  </sitemap>
</sitemapindex>`

  const entries = parseSitemapXml(xml)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].loc, 'https://example.com/sitemap-posts.xml')
  assert.equal(entries[1].loc, 'https://example.com/sitemap-pages.xml')
})

test('shouldSkipUrl filters non-HTML URLs', () => {
  assert.equal(shouldSkipUrl('https://example.com/doc.pdf'), true)
  assert.equal(shouldSkipUrl('https://example.com/image.png'), true)
  assert.equal(shouldSkipUrl('https://example.com/data.xml'), true)
  assert.equal(shouldSkipUrl('https://example.com/robots.txt'), true)
  assert.equal(shouldSkipUrl('https://example.com/style.css'), true)
  assert.equal(shouldSkipUrl('https://example.com/app.js'), true)
})

test('shouldSkipUrl allows HTML content pages', () => {
  assert.equal(shouldSkipUrl('https://example.com/'), false)
  assert.equal(shouldSkipUrl('https://example.com/about'), false)
  assert.equal(shouldSkipUrl('https://example.com/blog/post-1'), false)
  assert.equal(shouldSkipUrl('https://example.com/page.html'), false)
  assert.equal(shouldSkipUrl('https://example.com/page.htm'), false)
})
