import { describe, expect, it } from 'vitest'

import { parseUrlList } from '../src/cli.js'

describe('parseUrlList', () => {
  it('returns empty array for empty input', () => {
    expect(parseUrlList('')).toEqual([])
    expect(parseUrlList('   \n\n   ')).toEqual([])
  })

  it('parses one URL per line and trims whitespace', () => {
    const text = `
      https://a.com
      https://b.com
        https://c.com
    `
    expect(parseUrlList(text)).toEqual(['https://a.com', 'https://b.com', 'https://c.com'])
  })

  it('skips blank lines and lines starting with #', () => {
    const text = [
      '# Top tier',
      'https://a.com',
      '',
      '# Mid tier',
      'https://b.com',
      '#https://c.com (commented out)',
    ].join('\n')
    expect(parseUrlList(text)).toEqual(['https://a.com', 'https://b.com'])
  })

  it('handles comma-separated URLs on a single line (inline list)', () => {
    expect(parseUrlList('https://a.com,https://b.com,https://c.com')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
    ])
  })

  it('handles mixed newline + comma input', () => {
    const text = `
      https://a.com,https://b.com
      https://c.com
      https://d.com, https://e.com
    `
    expect(parseUrlList(text)).toEqual([
      'https://a.com',
      'https://b.com',
      'https://c.com',
      'https://d.com',
      'https://e.com',
    ])
  })

  it('handles CRLF line endings', () => {
    const text = 'https://a.com\r\nhttps://b.com\r\n'
    expect(parseUrlList(text)).toEqual(['https://a.com', 'https://b.com'])
  })

  it('drops empty entries from trailing commas / consecutive commas', () => {
    expect(parseUrlList('https://a.com,,https://b.com,')).toEqual([
      'https://a.com',
      'https://b.com',
    ])
  })
})
