import { clampScore, extractSchemaTypes } from './helpers.js'
import type { AnalysisResult, AuditContext, StructuredDataEntry } from '../types.js'

function findSchemaByType(structuredData: StructuredDataEntry[], typeName: string): StructuredDataEntry[] {
  return structuredData.filter((item) => {
    const rawType = item?.['@type']
    const types = Array.isArray(rawType) ? rawType : [rawType]
    return types.some((type) => typeof type === 'string' && type === typeName)
  })
}

export function analyzeEeatSignals(context: AuditContext): AnalysisResult {
  const findings: AnalysisResult['findings'] = []
  const recommendations: string[] = []
  let score = 0

  // Person schema with credentials (jobTitle, alumniOf, hasCredential)
  const persons = findSchemaByType(context.structuredData, 'Person')
  const credentialedPersons = persons.filter((person) =>
    person.jobTitle || person.alumniOf || person.hasCredential,
  )

  if (credentialedPersons.length > 0) {
    score += 25
    findings.push({ type: 'found', message: 'Person schema with credentials detected.' })
  } else if (persons.length > 0) {
    score += 12
    findings.push({ type: 'info', message: 'Person schema found but lacks credential properties.' })
    recommendations.push('Add jobTitle, alumniOf, or hasCredential to Person schema.')
  } else {
    findings.push({ type: 'missing', message: 'No Person schema found.' })
    recommendations.push('Add Person schema with expertise signals for key team members.')
  }

  // Meta author tag
  const authorMeta = context.$('meta[name="author"]').attr('content')
  if (authorMeta && authorMeta.trim()) {
    score += 15
    findings.push({ type: 'found', message: `Author meta tag found: "${authorMeta.trim()}".` })
  } else {
    findings.push({ type: 'missing', message: 'No <meta name="author"> tag detected.' })
    recommendations.push('Add a meta author tag to identify content authorship.')
  }

  // Review / AggregateRating schema
  const schemaTypes = extractSchemaTypes(context.structuredData)
  if (schemaTypes.has('Review') || schemaTypes.has('AggregateRating')) {
    score += 20
    findings.push({ type: 'found', message: 'Review or AggregateRating schema detected.' })
  } else {
    findings.push({ type: 'info', message: 'No Review or AggregateRating schema found.' })
    recommendations.push('Add Review or AggregateRating schema if customer reviews exist.')
  }

  // Trust page links (privacy, terms, about)
  const trustPaths = ['/privacy', '/terms', '/about']
  let trustLinkCount = 0

  context.$('a[href]').each((_, element) => {
    const href = (context.$(element).attr('href') || '').toLowerCase()
    for (const path of trustPaths) {
      if (href.includes(path)) {
        trustLinkCount += 1
        break
      }
    }
  })

  if (trustLinkCount >= 2) {
    score += 15
    findings.push({ type: 'found', message: 'Trust page links detected (privacy, terms, about).' })
  } else if (trustLinkCount === 1) {
    score += 8
    findings.push({ type: 'info', message: 'Some trust page links detected.' })
    recommendations.push('Add links to privacy policy, terms of service, and about page.')
  } else {
    findings.push({ type: 'missing', message: 'No trust page links detected.' })
    recommendations.push('Add footer links to privacy, terms, and about pages.')
  }

  // Organization schema with founder or employee
  const orgs = [
    ...findSchemaByType(context.structuredData, 'Organization'),
    ...findSchemaByType(context.structuredData, 'LocalBusiness'),
    ...findSchemaByType(context.structuredData, 'ProfessionalService'),
  ]

  const orgWithPeople = orgs.filter((org) => org.founder || org.employee || org.member)

  if (orgWithPeople.length > 0) {
    score += 25
    findings.push({ type: 'found', message: 'Organization schema includes founder/employee signals.' })
  } else if (orgs.length > 0) {
    score += 10
    findings.push({ type: 'info', message: 'Organization schema found but lacks people associations.' })
    recommendations.push('Add founder or employee properties to Organization schema.')
  } else {
    findings.push({ type: 'missing', message: 'No Organization schema detected.' })
  }

  return {
    score: clampScore(score),
    findings,
    recommendations,
  }
}
