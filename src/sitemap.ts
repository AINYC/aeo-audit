import { AeoAuditError } from './errors.js'
import { normalizeTargetUrl } from './fetch-page.js'
import { runAeoAudit } from './index.js'
import { scoreToGrade } from './scoring.js'
import type {
  AuditReport,
  CrossCuttingIssue,
  RunAeoAuditOptions,
  SitemapAuditOptions,
  SitemapAuditReport,
  SitemapPageResult,
} from './types.js'

const USER_AGENT = 'AINYC-AEO-Audit/1.0'
const SITEMAP_TIMEOUT_MS = 10_000
const SITEMAP_MAX_BYTES = 5 * 1024 * 1024

const SKIP_EXTENSIONS = new Set(['.pdf', '.txt', '.xml', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.mp4', '.mp3', '.zip', '.gz', '.css', '.js'])

function shouldSkipUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    return SKIP_EXTENSIONS.has(pathname.slice(pathname.lastIndexOf('.')))
  } catch {
    return true
  }
}

interface SitemapEntry {
  loc: string
  priority?: number
}

function parseSitemapXml(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = []

  // Extract <loc> elements and optional <priority> from <url> blocks
  const urlBlockRe = /<url\b[^>]*>([\s\S]*?)<\/url>/gi
  let urlMatch
  while ((urlMatch = urlBlockRe.exec(xml)) !== null) {
    const block = urlMatch[1]
    const locMatch = block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i)
    if (!locMatch) continue

    const loc = locMatch[1].trim()
    if (!loc) continue

    const priorityMatch = block.match(/<priority\b[^>]*>([\s\S]*?)<\/priority>/i)
    const priority = priorityMatch ? parseFloat(priorityMatch[1].trim()) : undefined

    entries.push({ loc, priority: Number.isFinite(priority) ? priority : undefined })
  }

  // Handle sitemap index files — extract nested sitemap URLs
  if (entries.length === 0) {
    const sitemapLocRe = /<sitemap\b[^>]*>[\s\S]*?<loc\b[^>]*>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/gi
    let sitemapMatch
    while ((sitemapMatch = sitemapLocRe.exec(xml)) !== null) {
      entries.push({ loc: sitemapMatch[1].trim() })
    }
  }

  return entries
}

async function fetchSitemapBody(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SITEMAP_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
    })

    if (!response.ok) {
      throw new AeoAuditError('UNREACHABLE', `Sitemap returned HTTP ${response.status}.`)
    }

    const reader = response.body?.getReader()
    if (!reader) return ''

    const chunks: Buffer[] = []
    let totalBytes = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = Buffer.from(value)
      totalBytes += chunk.length
      if (totalBytes > SITEMAP_MAX_BYTES) {
        await reader.cancel()
        throw new AeoAuditError('BODY_TOO_LARGE', `Sitemap exceeded ${SITEMAP_MAX_BYTES} bytes.`)
      }
      chunks.push(chunk)
    }

    return Buffer.concat(chunks).toString('utf8')
  } catch (error) {
    if (error instanceof AeoAuditError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AeoAuditError('TIMEOUT', `Sitemap fetch timed out after ${SITEMAP_TIMEOUT_MS}ms.`)
    }
    throw new AeoAuditError('UNREACHABLE', 'Could not fetch sitemap.', { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

async function resolveSitemapUrls(sitemapUrl: string): Promise<SitemapEntry[]> {
  const body = await fetchSitemapBody(sitemapUrl)
  const entries = parseSitemapXml(body)

  // If it's a sitemap index, fetch child sitemaps
  const isSitemapIndex = body.includes('<sitemapindex')
  if (isSitemapIndex) {
    const childResults = await Promise.all(
      entries.map(async (entry) => {
        try {
          const childBody = await fetchSitemapBody(entry.loc)
          return parseSitemapXml(childBody)
        } catch {
          return []
        }
      }),
    )
    return childResults.flat()
  }

  return entries
}

function buildCrossCuttingIssues(successPages: AuditReport[]): CrossCuttingIssue[] {
  if (successPages.length === 0) return []

  // Collect scores per factor across all pages
  const factorScores = new Map<string, { name: string; scores: number[]; recommendations: Map<string, number> }>()

  for (const page of successPages) {
    for (const factor of page.factors) {
      let entry = factorScores.get(factor.id)
      if (!entry) {
        entry = { name: factor.name, scores: [], recommendations: new Map() }
        factorScores.set(factor.id, entry)
      }
      entry.scores.push(factor.score)

      for (const rec of factor.recommendations) {
        entry.recommendations.set(rec, (entry.recommendations.get(rec) || 0) + 1)
      }
    }
  }

  const issues: CrossCuttingIssue[] = []

  for (const [factorId, entry] of factorScores) {
    const avgScore = Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
    const affectedPages = entry.scores.filter((s) => s < 70).length

    if (affectedPages === 0) continue

    // Sort recommendations by frequency
    const topRecs = [...entry.recommendations.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([rec]) => rec)

    issues.push({
      factorId,
      factorName: entry.name,
      avgScore,
      avgGrade: scoreToGrade(avgScore),
      affectedPages,
      totalPages: successPages.length,
      topRecommendations: topRecs,
    })
  }

  // Sort by impact: most affected pages first, then lowest avg score
  issues.sort((a, b) => b.affectedPages - a.affectedPages || a.avgScore - b.avgScore)

  return issues
}

function buildPrioritizedFixes(issues: CrossCuttingIssue[], totalPages: number): string[] {
  return issues
    .slice(0, 5)
    .map((issue) => {
      const pct = Math.round((issue.affectedPages / totalPages) * 100)
      const rec = issue.topRecommendations[0] || 'Review and improve this factor.'
      return `${issue.factorName} (avg ${issue.avgGrade}, affects ${pct}% of pages): ${rec}`
    })
}

export async function runSitemapAudit(rawUrl: string, options: SitemapAuditOptions = {}): Promise<SitemapAuditReport> {
  const normalizedUrl = normalizeTargetUrl(rawUrl)
  const origin = normalizedUrl.origin

  // Determine sitemap URL
  const sitemapUrl = options.sitemapUrl || `${origin}/sitemap.xml`

  // Fetch and parse sitemap
  let entries = await resolveSitemapUrls(sitemapUrl)

  // Filter to HTML content pages
  const allCount = entries.length
  entries = entries.filter((e) => !shouldSkipUrl(e.loc))

  // Sort by priority (highest first) if priorities exist
  entries.sort((a, b) => (b.priority ?? 0.5) - (a.priority ?? 0.5))

  // Apply limit
  if (options.limit && options.limit > 0) {
    entries = entries.slice(0, options.limit)
  }

  if (entries.length === 0) {
    throw new AeoAuditError('BAD_INPUT', 'No auditable URLs found in sitemap.')
  }

  const skipped = allCount - entries.length
  const auditOptions: RunAeoAuditOptions = {
    factors: options.factors,
    includeGeo: options.includeGeo,
  }

  // Audit each page (sequentially to avoid hammering the target)
  const pageResults: SitemapPageResult[] = []
  const successReports: AuditReport[] = []

  for (const entry of entries) {
    try {
      const report = await runAeoAudit(entry.loc, auditOptions)
      successReports.push(report)
      pageResults.push({
        url: report.finalUrl,
        overallScore: report.overallScore,
        overallGrade: report.overallGrade,
        status: 'success',
        factors: report.factors,
        metadata: report.metadata,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      pageResults.push({
        url: entry.loc,
        overallScore: 0,
        overallGrade: 'F',
        status: 'error',
        error: message,
      })
    }
  }

  // Calculate aggregate score from successful audits
  const successScores = pageResults.filter((p) => p.status === 'success').map((p) => p.overallScore)
  const aggregateScore = successScores.length > 0
    ? Math.round(successScores.reduce((a, b) => a + b, 0) / successScores.length)
    : 0

  const crossCuttingIssues = buildCrossCuttingIssues(successReports)
  const prioritizedFixes = buildPrioritizedFixes(crossCuttingIssues, successReports.length)

  return {
    sitemapUrl,
    auditedAt: new Date().toISOString(),
    pagesDiscovered: allCount,
    pagesAudited: entries.length,
    pagesSkipped: skipped,
    aggregateScore,
    aggregateGrade: scoreToGrade(aggregateScore),
    pages: pageResults,
    crossCuttingIssues,
    prioritizedFixes,
  }
}

export { parseSitemapXml, shouldSkipUrl }
