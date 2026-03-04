import { clampScore, extractSchemaTypes } from './helpers.js'

const PRIORITY_TYPES = ['LocalBusiness', 'FAQPage', 'Service', 'HowTo']

export function analyzeStructuredData(context) {
  const findings = []
  const recommendations = []
  const structuredData = context.structuredData || []
  const schemaTypes = extractSchemaTypes(structuredData)

  let score = 0

  if (structuredData.length > 0) {
    score += 30
    findings.push({ type: 'found', message: `Detected ${structuredData.length} JSON-LD block(s).` })
  } else {
    findings.push({ type: 'missing', message: 'No JSON-LD structured data found.' })
    recommendations.push('Add JSON-LD with LocalBusiness and Service schema.')
  }

  for (const type of PRIORITY_TYPES) {
    if (schemaTypes.has(type)) {
      score += 12
      findings.push({ type: 'found', message: `${type} schema detected.` })
    } else {
      findings.push({ type: 'missing', message: `${type} schema not found.` })
    }
  }

  const avgProperties = structuredData.length
    ? structuredData.reduce((sum, item) => sum + Object.keys(item).length, 0) / structuredData.length
    : 0

  if (avgProperties >= 8) {
    score += 22
    findings.push({ type: 'found', message: 'Structured data has strong property depth.' })
  } else if (avgProperties >= 4) {
    score += 12
    findings.push({ type: 'info', message: 'Structured data exists but could be more detailed.' })
    recommendations.push('Expand schema properties (contact, areaServed, sameAs, etc.).')
  } else if (structuredData.length) {
    findings.push({ type: 'info', message: 'Structured data appears shallow.' })
    recommendations.push('Increase schema completeness with richer properties.')
  }

  if (!recommendations.length && score >= 70) {
    recommendations.push('Maintain schema parity as new pages and services are added.')
  }

  return {
    score: clampScore(score),
    findings,
    recommendations,
  }
}
