import { clampScore } from './analyzers/helpers.js'
import type { FactorDefinition, RawFactorResult, ScoredFactorSummary } from './types.js'

export const FACTOR_DEFINITIONS: FactorDefinition[] = [
  { id: 'structured-data', name: 'Structured Data (JSON-LD)', weight: 12 },
  { id: 'content-depth', name: 'Content Depth', weight: 10 },
  { id: 'ai-readable-content', name: 'AI-Readable Content', weight: 10 },
  { id: 'eeat-signals', name: 'E-E-A-T Signals', weight: 8 },
  { id: 'faq-content', name: 'FAQ Content', weight: 8 },
  { id: 'citations', name: 'Citations & Authority Signals', weight: 8 },
  { id: 'schema-completeness', name: 'Schema Completeness', weight: 8 },
  { id: 'entity-consistency', name: 'Entity Consistency', weight: 7 },
  { id: 'content-freshness', name: 'Content Freshness', weight: 7 },
  { id: 'content-extractability', name: 'Content Extractability', weight: 6 },
  { id: 'definition-blocks', name: 'Definition Blocks', weight: 6 },
  { id: 'ai-crawler-access', name: 'AI Crawler Access', weight: 4 },
  { id: 'named-entities', name: 'Named Entities', weight: 6 },
  { id: 'technical-seo', name: 'Technical SEO', weight: 5 },
]

export const OPTIONAL_FACTOR_DEFINITIONS: FactorDefinition[] = [
  { id: 'geographic-signals', name: 'Geographic Signals', weight: 7 },
]

export function scoreToGrade(score: number): string {
  if (score >= 97) return 'A+'
  if (score >= 93) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 87) return 'B+'
  if (score >= 83) return 'B'
  if (score >= 80) return 'B-'
  if (score >= 77) return 'C+'
  if (score >= 73) return 'C'
  if (score >= 70) return 'C-'
  if (score >= 67) return 'D+'
  if (score >= 63) return 'D'
  if (score >= 60) return 'D-'
  return 'F'
}

export function scoreToStatus(score: number): 'pass' | 'partial' | 'fail' {
  if (score >= 70) return 'pass'
  if (score >= 40) return 'partial'
  return 'fail'
}

export function scoreFactors(rawFactorResults: RawFactorResult[]): ScoredFactorSummary {
  const factors = rawFactorResults.map((factor) => {
    const score = clampScore(factor.score)
    return {
      ...factor,
      score,
      grade: scoreToGrade(score),
      status: scoreToStatus(score),
    }
  })

  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0)

  const weightedTotal = factors.reduce((sum, factor) => (
    sum + ((factor.score / 100) * (factor.weight / totalWeight) * 100)
  ), 0)

  const overallScore = clampScore(weightedTotal)

  return {
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    factors,
  }
}
