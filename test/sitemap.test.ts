import { test, expect } from 'vitest'

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
  expect(entries).toHaveLength(3)
  expect(entries[0].loc).toBe('https://example.com/')
  expect(entries[0].priority).toBe(1.0)
  expect(entries[1].loc).toBe('https://example.com/about')
  expect(entries[1].priority).toBe(0.8)
  expect(entries[2].loc).toBe('https://example.com/blog')
  expect(entries[2].priority).toBeUndefined()
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
  expect(entries).toHaveLength(2)
  expect(entries[0].loc).toBe('https://example.com/sitemap-posts.xml')
  expect(entries[1].loc).toBe('https://example.com/sitemap-pages.xml')
})

test('shouldSkipUrl filters non-HTML URLs', () => {
  expect(shouldSkipUrl('https://example.com/doc.pdf')).toBe(true)
  expect(shouldSkipUrl('https://example.com/image.png')).toBe(true)
  expect(shouldSkipUrl('https://example.com/data.xml')).toBe(true)
  expect(shouldSkipUrl('https://example.com/robots.txt')).toBe(true)
  expect(shouldSkipUrl('https://example.com/style.css')).toBe(true)
  expect(shouldSkipUrl('https://example.com/app.js')).toBe(true)
})

test('shouldSkipUrl allows HTML content pages', () => {
  expect(shouldSkipUrl('https://example.com/')).toBe(false)
  expect(shouldSkipUrl('https://example.com/about')).toBe(false)
  expect(shouldSkipUrl('https://example.com/blog/post-1')).toBe(false)
  expect(shouldSkipUrl('https://example.com/page.html')).toBe(false)
  expect(shouldSkipUrl('https://example.com/page.htm')).toBe(false)
})
