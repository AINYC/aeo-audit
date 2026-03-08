import { load } from 'cheerio'
import { fetchPage, normalizeTargetUrl } from './fetch-page.js'
import { AeoAuditError } from './errors.js'
import { analyzeStructuredData } from './analyzers/structured-data.js'
import { analyzeAiReadableContent } from './analyzers/ai-readable-content.js'
import { analyzeEntityConsistency } from './analyzers/entity-consistency.js'
import { analyzeContentDepth } from './analyzers/content-depth.js'
import { analyzeDefinitionBlocks } from './analyzers/definition-blocks.js'
import { analyzeFaqContent } from './analyzers/faq-content.js'
import { analyzeNamedEntities } from './analyzers/named-entities.js'
import { analyzeCitations } from './analyzers/citations.js'
import { analyzeContentFreshness } from './analyzers/content-freshness.js'
import { analyzeGeographicSignals } from './analyzers/geographic-signals.js'
import { analyzeEeatSignals } from './analyzers/eeat-signals.js'
import { analyzeAiCrawlerAccess } from './analyzers/ai-crawler-access.js'
import { analyzeSchemaCompleteness } from './analyzers/schema-completeness.js'
import { analyzeContentExtractability } from './analyzers/content-extractability.js'
import { getVisibleText, parseJsonLdScripts, countWords } from './analyzers/helpers.js'
import { FACTOR_DEFINITIONS, OPTIONAL_FACTOR_DEFINITIONS, scoreFactors } from './scoring.js'
import type { Analyzer, AuditContext, AuditReport, RunAeoAuditOptions, ScoredFactor } from './types.js'

const ANALYZER_BY_ID: Record<string, Analyzer> = {
  'structured-data': analyzeStructuredData,
  'ai-readable-content': analyzeAiReadableContent,
  'entity-consistency': analyzeEntityConsistency,
  'content-depth': analyzeContentDepth,
  'definition-blocks': analyzeDefinitionBlocks,
  'faq-content': analyzeFaqContent,
  'named-entities': analyzeNamedEntities,
  citations: analyzeCitations,
  'content-freshness': analyzeContentFreshness,
  'geographic-signals': analyzeGeographicSignals,
  'eeat-signals': analyzeEeatSignals,
  'ai-crawler-access': analyzeAiCrawlerAccess,
  'schema-completeness': analyzeSchemaCompleteness,
  'content-extractability': analyzeContentExtractability,
}

const ALL_FACTOR_IDS = new Set([
  ...FACTOR_DEFINITIONS.map((d) => d.id),
  ...OPTIONAL_FACTOR_DEFINITIONS.map((d) => d.id),
])

function buildSummary(factors: ScoredFactor[], overallGrade: string): string {
  if (!factors.length) {
    return `Overall grade ${overallGrade}. No factors evaluated.`
  }

  const ranked = [...factors].sort((a, b) => b.score - a.score)
  const strengths = ranked.slice(0, 2).map((factor) => factor.name)
  const weaknesses = ranked.slice(-2).map((factor) => factor.name)

  return `Overall grade ${overallGrade}. Strongest signals: ${strengths.join(', ')}. Biggest opportunities: ${weaknesses.join(', ')}.`
}

export async function runAeoAudit(rawUrl: string, options: RunAeoAuditOptions = {}): Promise<AuditReport> {
  const normalizedUrl = normalizeTargetUrl(rawUrl)
  const selectedFactors = options.factors ?? []

  // Validate factor IDs if provided
  if (selectedFactors.length > 0) {
    const invalid = selectedFactors.filter((id) => !ALL_FACTOR_IDS.has(id))
    if (invalid.length > 0) {
      throw new AeoAuditError('BAD_INPUT', `Unknown factor ID(s): ${invalid.join(', ')}. Valid IDs: ${[...ALL_FACTOR_IDS].join(', ')}`)
    }
  }

  const fetchedPage = await fetchPage(normalizedUrl.toString())

  const $ = load(fetchedPage.html)
  const structuredData = parseJsonLdScripts($)
  const textContent = getVisibleText($, fetchedPage.html)

  const context: AuditContext = {
    $,
    html: fetchedPage.html,
    url: fetchedPage.finalUrl,
    headers: fetchedPage.headers,
    auxiliary: fetchedPage.auxiliary,
    structuredData,
    textContent,
    pageTitle: $('title').first().text().trim(),
  }

  // Determine which factors to run
  let activeDefs = [...FACTOR_DEFINITIONS]

  if (options.includeGeo) {
    activeDefs = [...activeDefs, ...OPTIONAL_FACTOR_DEFINITIONS]
  }

  if (selectedFactors.length > 0) {
    activeDefs = activeDefs.filter((def) => selectedFactors.includes(def.id))
  }

  const rawFactorResults = await Promise.all(
    activeDefs.map(async (definition) => {
      const analyzer = ANALYZER_BY_ID[definition.id]!
      const result = await analyzer(context)

      return {
        id: definition.id,
        name: definition.name,
        weight: definition.weight,
        score: result.score,
        findings: result.findings,
        recommendations: result.recommendations,
      }
    }),
  )

  const { overallScore, overallGrade, factors } = scoreFactors(rawFactorResults)

  return {
    url: fetchedPage.inputUrl,
    finalUrl: fetchedPage.finalUrl,
    auditedAt: new Date().toISOString(),
    overallScore,
    overallGrade,
    summary: buildSummary(factors, overallGrade),
    factors,
    metadata: {
      fetchTimeMs: fetchedPage.timings.fetchTimeMs,
      pageTitle: context.pageTitle,
      wordCount: countWords(textContent),
      auxiliary: {
        llmsTxt: fetchedPage.auxiliary.llmsTxt?.state || 'missing',
        llmsFullTxt: fetchedPage.auxiliary.llmsFullTxt?.state || 'missing',
        robotsTxt: fetchedPage.auxiliary.robotsTxt?.state || 'missing',
        sitemapXml: fetchedPage.auxiliary.sitemapXml?.state || 'missing',
      },
      redirectChain: fetchedPage.redirectChain,
    },
  }
}
