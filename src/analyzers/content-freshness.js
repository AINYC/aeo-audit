import { clampScore, parseIsoDate } from './helpers.js'

function monthsAgo(date) {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 0) {
    return 0
  }

  return diffMs / (1000 * 60 * 60 * 24 * 30)
}

function extractSitemapLastmod(sitemapXml, targetUrl) {
  if (!sitemapXml) {
    return null
  }

  const target = new URL(targetUrl)
  const escapedUrl = target.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const entryPattern = new RegExp(`<url>[\\s\\S]*?<loc>${escapedUrl}<\\/loc>[\\s\\S]*?<lastmod>(.*?)<\\/lastmod>[\\s\\S]*?<\\/url>`, 'i')
  const match = sitemapXml.match(entryPattern)

  // Only return the lastmod if it matches the target URL exactly.
  // Do NOT fall back to the first <lastmod> in the sitemap — that
  // belongs to a different URL and would produce a false freshness signal.
  return match?.[1] || null
}

export function analyzeContentFreshness(context) {
  const findings = []
  const recommendations = []
  let score = 0

  const dateModifiedCandidates = []
  for (const item of context.structuredData) {
    if (typeof item?.dateModified === 'string') {
      dateModifiedCandidates.push(item.dateModified)
    }
  }

  const parsedModifiedDates = dateModifiedCandidates
    .map((value) => parseIsoDate(value))
    .filter(Boolean)

  if (parsedModifiedDates.length) {
    const newest = parsedModifiedDates.sort((a, b) => b.getTime() - a.getTime())[0]
    const months = monthsAgo(newest)

    if (months <= 3) {
      score += 35
      findings.push({ type: 'found', message: 'Structured data indicates recent updates (<= 3 months).' })
    } else if (months <= 12) {
      score += 22
      findings.push({ type: 'info', message: 'Structured data indicates updates within the last year.' })
    } else {
      score += 10
      findings.push({ type: 'info', message: 'Structured data suggests content may be stale.' })
      recommendations.push('Refresh key pages and update dateModified in structured data.')
    }
  } else {
    findings.push({ type: 'missing', message: 'No dateModified field detected in structured data.' })
    recommendations.push('Add dateModified to relevant structured data entities.')
  }

  const lastModifiedHeader = context.headers?.['last-modified']
  const parsedHeaderDate = parseIsoDate(lastModifiedHeader)
  if (parsedHeaderDate) {
    const months = monthsAgo(parsedHeaderDate)
    if (months <= 3) {
      score += 20
      findings.push({ type: 'found', message: 'HTTP Last-Modified header is recent.' })
    } else {
      score += 12
      findings.push({ type: 'info', message: 'HTTP Last-Modified header exists but is older.' })
    }
  } else {
    findings.push({ type: 'info', message: 'No usable Last-Modified response header detected.' })
  }

  const sitemapState = context.auxiliary?.sitemapXml?.state
  if (sitemapState === 'ok') {
    const sitemapDateRaw = extractSitemapLastmod(context.auxiliary.sitemapXml.body, context.url)
    const sitemapDate = parseIsoDate(sitemapDateRaw)

    if (sitemapDate) {
      const months = monthsAgo(sitemapDate)
      if (months <= 3) {
        score += 22
        findings.push({ type: 'found', message: 'Sitemap lastmod indicates recent updates.' })
      } else {
        score += 12
        findings.push({ type: 'info', message: 'Sitemap lastmod exists but may be stale.' })
      }
    } else {
      score += 4
      findings.push({ type: 'info', message: 'Sitemap found but no matching lastmod for this URL.' })
      recommendations.push('Add a <lastmod> entry for this URL in sitemap.xml.')
    }
  } else if (sitemapState === 'timeout') {
    score += 8
    findings.push({ type: 'timeout', message: 'Could not reliably fetch sitemap.xml.' })
  } else if (sitemapState === 'unreachable') {
    score += 8
    findings.push({ type: 'unreachable', message: 'Could not reliably fetch sitemap.xml.' })
  } else {
    findings.push({ type: 'missing', message: 'sitemap.xml is missing or inaccessible.' })
  }

  const yearMatch = context.textContent.match(/(?:©|copyright)?\s*(20\d{2})/i)
  if (yearMatch) {
    const year = Number(yearMatch[1])
    const currentYear = new Date().getUTCFullYear()
    if (year >= currentYear - 1) {
      score += 23
      findings.push({ type: 'found', message: `Recent copyright year detected (${year}).` })
    } else {
      score += 12
      findings.push({ type: 'info', message: `Older copyright year detected (${year}).` })
    }
  } else {
    score += 6
    findings.push({ type: 'info', message: 'No copyright year signal detected.' })
  }

  return {
    score: clampScore(score),
    findings,
    recommendations,
  }
}
