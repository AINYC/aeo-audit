import { load, type CheerioAPI } from 'cheerio'
import type { AuditContext, StructuredDataEntry } from '../types.js'

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function normalizeText(value = ''): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeEntityName(value = ''): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(llc|inc|corp|co|ltd|agency|company)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countWords(value = ''): number {
  if (!value) {
    return 0
  }

  return value
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length
}

export function parseJsonLdScripts($: CheerioAPI): StructuredDataEntry[] {
  const scripts = $('script[type="application/ld+json"]')
  const items: StructuredDataEntry[] = []

  scripts.each((_, element) => {
    const raw = $(element).html()
    if (!raw || !raw.trim()) {
      return
    }

    try {
      const parsed: unknown = JSON.parse(raw)
      flattenStructuredData(parsed, items)
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  })

  return items
}

function flattenStructuredData(candidate: unknown, accumulator: StructuredDataEntry[]): void {
  if (!candidate) {
    return
  }

  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      flattenStructuredData(item, accumulator)
    }

    return
  }

  if (typeof candidate !== 'object') {
    return
  }

  const structuredCandidate = candidate as StructuredDataEntry

  if (structuredCandidate['@graph']) {
    flattenStructuredData(structuredCandidate['@graph'], accumulator)
  }

  accumulator.push(structuredCandidate)
}

export function getVisibleText(_$: CheerioAPI, html: string): string {
  const cloned = load(html)
  cloned('script, style, noscript').remove()

  return normalizeText(cloned('body').text())
}

export function extractSchemaTypes(structuredData: StructuredDataEntry[]): Set<string> {
  const types = new Set<string>()

  for (const item of structuredData) {
    const rawType = item?.['@type']
    if (!rawType) {
      continue
    }

    const typeValues = Array.isArray(rawType) ? rawType : [rawType]
    for (const type of typeValues) {
      if (typeof type === 'string' && type.trim()) {
        types.add(type.trim())
      }
    }
  }

  return types
}

export function getStructuredDataNames(structuredData: StructuredDataEntry[]): string[] {
  const names: string[] = []

  for (const item of structuredData) {
    if (typeof item?.name === 'string' && item.name.trim()) {
      names.push(item.name.trim())
    }
  }

  return names
}

export function getBusinessName(context: Pick<AuditContext, 'structuredData' | 'pageTitle'>): string {
  const schemaName = getStructuredDataNames(context.structuredData)[0]
  if (schemaName) {
    return schemaName
  }

  const title = normalizeText(context.pageTitle || '')
  if (!title) {
    return ''
  }

  return title.split(/[|\-–—]/)[0].trim()
}

export function collectEmails(value = ''): string[] {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []
}

export function collectPhones(value = ''): string[] {
  return value.match(/\+?\d[\d\s().-]{7,}\d/g) || []
}

export function parseIsoDate(raw: unknown): Date | null {
  if (!raw || typeof raw !== 'string') {
    return null
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

export function domainFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return ''
  }
}
